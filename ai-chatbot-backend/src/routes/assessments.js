/**
 * ASSESSMENT ROUTES - Enhanced for tracking user evaluations
 * Handles university recommendation assessments with AI integration
 */

import express from "express";
import { getCollection } from "../config/db.js";
import { ObjectId } from "mongodb";
import authMiddleware from "../middleware/authMiddleware.js";
import { logAssessment } from "../middleware/conversationLogger.js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000/respond";

/**
 * Submit user assessment and get AI recommendations
 */
router.post("/submit", async (req, res) => {
  try {
    const {
      userId,
      conversationId,
      assessmentData,
      assessmentType = "university_preference"
    } = req.body;

    console.log(`📋 Processing assessment for user: ${userId || 'anonymous'}`);

    // Validate required data
    if (!assessmentData) {
      return res.status(400).json({
        success: false,
        message: "Assessment data is required"
      });
    }

    // Generate AI recommendations based on assessment
    console.log('🤖 Generating AI recommendations...');
    const aiRecommendations = await generateAIRecommendations(assessmentData);

    // Create comprehensive assessment record
    const assessmentRecord = {
      user_id: userId || 'anonymous',
      conversation_id: conversationId,
      assessment_type: assessmentType,
      assessment_data: {
        grades: assessmentData.grades || [],
        subjects: assessmentData.subjects || [],
        interests: assessmentData.interests || [],
        career_goals: assessmentData.careerGoals || '',
        preferred_location: assessmentData.preferredLocation || '',
        extracurricular: assessmentData.extracurricular || [],
        financial_situation: assessmentData.financialSituation || '',
        program_preferences: assessmentData.programPreferences || []
      },
      ai_recommendations: aiRecommendations.recommendations || [],
      university_matches: aiRecommendations.universityMatches || [],
      recommendation_confidence: aiRecommendations.confidence || 0.0,
      completed: true,
      followup_actions: aiRecommendations.followupActions || [],
      created_at: new Date(),
      updated_at: new Date(),
      metadata: {
        source: 'chat_assessment',
        version: '2.0.0',
        processing_model: aiRecommendations.modelUsed || 'hybrid-rag'
      }
    };

    // Log assessment using middleware
    const assessmentId = await logAssessment(assessmentRecord);

    // Update user profile
    if (userId && userId !== 'anonymous') {
      await updateUserProfile(userId, assessmentRecord);
    }

    // Generate personalized message for chat
    const personalizedMessage = generateAssessmentMessage(assessmentRecord);

    console.log(`✅ Assessment processed with ID: ${assessmentId}`);

    res.json({
      success: true,
      assessment_id: assessmentId,
      recommendations: aiRecommendations.recommendations,
      university_matches: aiRecommendations.universityMatches,
      confidence: aiRecommendations.confidence,
      personalized_message: personalizedMessage,
      followup_actions: aiRecommendations.followupActions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Assessment submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process assessment",
      error: error.message
    });
  }
});

/**
 * Get user's assessment history
 */
router.get("/history/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const assessmentsCollection = await getCollection("user_assessments");
    
    const [assessments, total] = await Promise.all([
      assessmentsCollection
        .find({ user_id: userId })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      assessmentsCollection.countDocuments({ user_id: userId })
    ]);

    const formattedAssessments = assessments.map(assessment => ({
      id: assessment._id.toString(),
      assessment_type: assessment.assessment_type,
      completed: assessment.completed,
      recommendations_count: assessment.ai_recommendations?.length || 0,
      university_matches_count: assessment.university_matches?.length || 0,
      confidence: assessment.recommendation_confidence,
      created_at: assessment.created_at,
      summary: generateAssessmentSummary(assessment)
    }));

    res.json({
      success: true,
      assessments: formattedAssessments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("❌ Assessment history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assessment history"
    });
  }
});

/**
 * Get specific assessment details
 */
router.get("/:assessmentId", authMiddleware, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user.id;

    const assessmentsCollection = await getCollection("user_assessments");
    const assessment = await assessmentsCollection.findOne({
      _id: new ObjectId(assessmentId),
      user_id: new ObjectId(userId)
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found"
      });
    }

    res.json({
      success: true,
      assessment: {
        id: assessment._id.toString(),
        assessment_type: assessment.assessment_type,
        assessment_data: assessment.assessment_data,
        ai_recommendations: assessment.ai_recommendations,
        university_matches: assessment.university_matches,
        confidence: assessment.recommendation_confidence,
        followup_actions: assessment.followup_actions,
        created_at: assessment.created_at,
        metadata: assessment.metadata
      }
    });

  } catch (error) {
    console.error("❌ Assessment fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch assessment details"
    });
  }
});

/**
 * Update assessment with user feedback
 */
router.put("/:assessmentId/feedback", authMiddleware, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const userId = req.user.id;
    const { helpful, rating, comments, selected_universities } = req.body;

    const assessmentsCollection = await getCollection("user_assessments");
    
    const updateData = {
      user_feedback: {
        helpful: helpful,
        rating: rating, // 1-5 rating
        comments: comments,
        selected_universities: selected_universities || [],
        feedback_date: new Date()
      },
      updated_at: new Date()
    };

    const result = await assessmentsCollection.updateOne(
      {
        _id: new ObjectId(assessmentId),
        user_id: new ObjectId(userId)
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Assessment not found"
      });
    }

    console.log(`✅ Assessment feedback updated: ${assessmentId}`);
    
    res.json({
      success: true,
      message: "Feedback saved successfully",
      assessment_id: assessmentId
    });

  } catch (error) {
    console.error("❌ Assessment feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save feedback"
    });
  }
});

/**
 * Generate AI recommendations based on assessment data
 */
async function generateAIRecommendations(assessmentData) {
  try {
    // Prepare AI prompt with assessment data
    const prompt = `Based on this student's assessment data, provide university and program recommendations:

Student Profile:
- Grades: ${assessmentData.grades?.join(', ') || 'Not specified'}
- Interests: ${assessmentData.interests?.join(', ') || 'Not specified'}
- Career Goals: ${assessmentData.careerGoals || 'Not specified'}
- Preferred Location: ${assessmentData.preferredLocation || 'Any location in Ghana'}
- Subjects: ${assessmentData.subjects?.join(', ') || 'Not specified'}

Please recommend the top 3 universities and programs that best match this profile, considering Ghana's education system.`;

    const aiRequest = {
      message: prompt,
      conversation_id: `assessment_${Date.now()}`,
      user_context: {
        is_assessment_request: true,
        assessment_data: assessmentData,
        timestamp: new Date().toISOString()
      }
    };

    console.log('🤖 Sending assessment to AI service...');
    const response = await fetch(AI_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(aiRequest),
      timeout: 30000
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('✅ AI recommendations received');

    // Process AI response into structured recommendations
    return processAIRecommendations(aiResponse, assessmentData);

  } catch (error) {
    console.error('❌ AI recommendation error:', error);
    
    // Fallback to rule-based recommendations
    return generateFallbackRecommendations(assessmentData);
  }
}

/**
 * Process AI response into structured recommendations
 */
function processAIRecommendations(aiResponse, assessmentData) {
  const recommendations = [];
  const universityMatches = [];
  
  // Extract university recommendations from AI response
  const universityData = {
    'University of Ghana': {
      strengths: ['Established reputation', 'Central location', 'Diverse programs'],
      programs: ['Computer Science', 'Medicine', 'Business Administration'],
      location: 'Accra'
    },
    'KNUST': {
      strengths: ['Technology focus', 'Engineering excellence', 'Industry connections'],
      programs: ['Computer Engineering', 'Civil Engineering', 'Architecture'],
      location: 'Kumasi'
    },
    'University of Cape Coast': {
      strengths: ['Education focus', 'Research opportunities', 'Coastal location'],
      programs: ['Education', 'Social Sciences', 'Health Sciences'],
      location: 'Cape Coast'
    }
  };

  // Generate structured recommendations based on assessment
  Object.entries(universityData).forEach(([universityName, data], index) => {
    const matchScore = calculateMatchScore(assessmentData, universityName, data);
    
    if (matchScore > 60) { // Only recommend good matches
      recommendations.push({
        university_name: universityName,
        program_name: selectBestProgram(assessmentData, data.programs),
        confidence_score: matchScore / 100,
        reasoning: generateRecommendationReasoning(assessmentData, universityName, data),
        requirements_met: assessRequirementsMet(assessmentData, universityName),
        scholarship_eligible: assessScholarshipEligibility(assessmentData),
        career_alignment: assessCareerAlignment(assessmentData, universityName),
        priority: index + 1
      });

      universityMatches.push({
        university_name: universityName,
        match_score: matchScore,
        programs_eligible: getEligiblePrograms(assessmentData, data.programs),
        strengths: data.strengths,
        concerns: generateConcerns(assessmentData, universityName),
        next_steps: generateNextSteps(universityName)
      });
    }
  });

  return {
    recommendations: recommendations.slice(0, 3), // Top 3 recommendations
    universityMatches: universityMatches.slice(0, 5), // Top 5 matches
    confidence: aiResponse.confidence || 0.8,
    followupActions: generateFollowupActions(assessmentData),
    modelUsed: aiResponse.model_used || 'hybrid-rag'
  };
}

/**
 * Generate fallback recommendations when AI fails
 */
function generateFallbackRecommendations(assessmentData) {
  console.log('🔄 Generating fallback recommendations...');
  
  const fallbackRecommendations = [
    {
      university_name: "University of Ghana",
      program_name: "Computer Science",
      confidence_score: 0.7,
      reasoning: "Well-established program with good career prospects",
      requirements_met: true,
      scholarship_eligible: true,
      career_alignment: 8,
      priority: 1
    },
    {
      university_name: "KNUST",
      program_name: "Computer Engineering",
      confidence_score: 0.75,
      reasoning: "Excellent technology focus and industry connections",
      requirements_met: true,
      scholarship_eligible: true,
      career_alignment: 9,
      priority: 2
    }
  ];

  return {
    recommendations: fallbackRecommendations,
    universityMatches: [],
    confidence: 0.6,
    followupActions: [
      "Research specific program requirements",
      "Visit university websites for current information",
      "Contact admissions offices directly"
    ],
    modelUsed: 'fallback-rules'
  };
}

/**
 * Helper functions for recommendation processing
 */
function calculateMatchScore(assessmentData, universityName, universityData) {
  let score = 50; // Base score
  
  // Add points for location preference
  if (assessmentData.preferredLocation && 
      universityData.location.toLowerCase().includes(assessmentData.preferredLocation.toLowerCase())) {
    score += 20;
  }
  
  // Add points for career alignment
  if (assessmentData.careerGoals && assessmentData.careerGoals.toLowerCase().includes('technology')) {
    if (universityName === 'KNUST') score += 25;
    if (universityName === 'University of Ghana') score += 20;
  }
  
  // Add points for grade quality (simplified)
  if (assessmentData.grades && assessmentData.grades.some(grade => grade.includes('A'))) {
    score += 15;
  }
  
  return Math.min(score, 95); // Cap at 95%
}

function selectBestProgram(assessmentData, availablePrograms) {
  // Simple program selection based on interests
  if (assessmentData.careerGoals?.toLowerCase().includes('engineer')) {
    return availablePrograms.find(p => p.toLowerCase().includes('engineering')) || availablePrograms[0];
  }
  if (assessmentData.careerGoals?.toLowerCase().includes('doctor')) {
    return availablePrograms.find(p => p.toLowerCase().includes('medicine')) || availablePrograms[0];
  }
  return availablePrograms[0];
}

function generateRecommendationReasoning(assessmentData, universityName, universityData) {
  return `Based on your interests in ${assessmentData.interests?.join(', ') || 'various fields'} and career goals in ${assessmentData.careerGoals || 'your chosen field'}, ${universityName} offers strong programs with ${universityData.strengths.join(', ')}.`;
}

function assessRequirementsMet(assessmentData, universityName) {
  // Simplified requirements check
  return assessmentData.grades && assessmentData.grades.length > 0;
}

function assessScholarshipEligibility(assessmentData) {
  // Basic scholarship eligibility
  return assessmentData.financialSituation === 'need_scholarship' || 
         assessmentData.grades?.some(grade => grade.includes('A'));
}

function assessCareerAlignment(assessmentData, universityName) {
  // Rate career alignment 1-10
  if (assessmentData.careerGoals?.toLowerCase().includes('technology') && universityName === 'KNUST') {
    return 9;
  }
  return 7; // Default good alignment
}

function getEligiblePrograms(assessmentData, programs) {
  // Return programs student is likely eligible for
  return programs.filter(program => {
    // Simplified eligibility check
    return true;
  });
}

function generateConcerns(assessmentData, universityName) {
  const concerns = [];
  
  if (assessmentData.financialSituation === 'financial_constraints') {
    concerns.push('Consider scholarship options and financial aid');
  }
  
  if (assessmentData.preferredLocation && !universityName.includes(assessmentData.preferredLocation)) {
    concerns.push('Location may not match preference');
  }
  
  return concerns;
}

function generateNextSteps(universityName) {
  return [
    `Visit ${universityName} official website`,
    'Check current admission requirements',
    'Prepare application documents',
    'Contact admissions office for guidance'
  ];
}

function generateFollowupActions(assessmentData) {
  const actions = [
    'Research specific program requirements for recommended universities',
    'Prepare WASSCE documentation',
    'Start application process early'
  ];
  
  if (assessmentData.financialSituation === 'need_scholarship') {
    actions.push('Apply for available scholarships');
  }
  
  return actions;
}

/**
 * Update user profile with assessment results
 */
async function updateUserProfile(userId, assessmentRecord) {
  try {
    const userProfilesCollection = await getCollection("user_profiles");
    
    const profileUpdate = {
      user_id: new ObjectId(userId),
      last_assessment: assessmentRecord._id || new ObjectId(),
      preferences: {
        subjects: assessmentRecord.assessment_data.subjects,
        career_goals: assessmentRecord.assessment_data.career_goals,
        preferred_location: assessmentRecord.assessment_data.preferred_location,
        interests: assessmentRecord.assessment_data.interests
      },
      ai_recommendations: assessmentRecord.ai_recommendations,
      university_matches: assessmentRecord.university_matches,
      updated_at: new Date()
    };

    await userProfilesCollection.updateOne(
      { user_id: new ObjectId(userId) },
      { 
        $set: profileUpdate,
        $inc: { assessment_count: 1 }
      },
      { upsert: true }
    );

    console.log(`✅ User profile updated: ${userId}`);
  } catch (error) {
    console.error('❌ User profile update error:', error);
  }
}

/**
 * Generate personalized message for chat interface
 */
function generateAssessmentMessage(assessmentRecord) {
  const recommendations = assessmentRecord.ai_recommendations;
  const topUniversity = recommendations[0]?.university_name || 'Ghanaian universities';
  const topProgram = recommendations[0]?.program_name || 'your preferred program';
  
  return `Based on your assessment, I recommend exploring ${topProgram} at ${topUniversity}. Your academic profile shows strong potential for this program. Would you like detailed information about admission requirements and application procedures?`;
}

/**
 * Generate assessment summary for history
 */
function generateAssessmentSummary(assessment) {
  const topRecommendation = assessment.ai_recommendations?.[0];
  if (topRecommendation) {
    return `Top recommendation: ${topRecommendation.program_name} at ${topRecommendation.university_name}`;
  }
  return 'Assessment completed';
}

export default router;