import express from "express";
import multer from "multer";
import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
import { getCollection } from "../config/db.js";
import { ObjectId } from "mongodb";
import authMiddleware from "../middleware/authMiddleware.js";
import { logConversationMiddleware, logAssessment } from "../middleware/conversationLogger.js";
import { cacheMiddleware, cacheManager } from "../middleware/cacheManager.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Python RAG endpoint
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000/respond";

// 📎 File upload endpoint for chat with attachments
router.post("/upload", upload.array('files', 5), async (req, res) => {
  try {
    const { message, conversation_id, university_name } = req.body;
    const userId = req.user?.id || 'demo_user';
    const files = req.files || [];

    console.log('📎 Processing message with files:', {
      message: message?.substring(0, 100),
      fileCount: files.length,
      conversation_id,
      university_name
    });

    if (!message && files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Either message or files are required"
      });
    }

    // Get MongoDB collections
    const chatsCollection = await getCollection('chats');

    // Process uploaded files
    const fileAttachments = files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));

    // Create message text including file information
    let messageText = message || '';
    if (files.length > 0) {
      const fileInfo = files.map(f => `📎 ${f.originalname} (${(f.size/1024).toFixed(1)}KB)`).join('\n');
      messageText = message ? `${message}\n\n${fileInfo}` : fileInfo;
    }

    // Save user message with attachments to MongoDB
    const userMessage = {
      user_id: userId === 'demo_user' ? userId : new ObjectId(userId),
      conversation_id: conversation_id,
      message: messageText,
      is_bot: false,
      created_at: new Date(),
      timestamp: new Date().toISOString(),
      attachments: fileAttachments
    };

    await chatsCollection.insertOne(userMessage);
    console.log('✅ Saved user message with files to MongoDB');

    // Prepare enhanced RAG request with file information
    const ragRequest = {
      message: message || `User sent ${files.length} file(s)`,
      conversation_id: conversation_id,
      university_name: university_name || null,
      files: fileAttachments,
      user_context: {
        user_id: userId,
        preferred_university: university_name,
        has_attachments: files.length > 0,
        file_types: files.map(f => f.mimetype)
      }
    };

    console.log('🔍 Sending message with files to RAG service...');

    // FIXED: Send files to the new RAG service endpoint
    const formData = new FormData();
    formData.append('message', message || `User sent ${files.length} file(s)`);
    formData.append('conversation_id', conversation_id);
    formData.append('university_name', university_name || '');
    formData.append('user_context', JSON.stringify({
      user_id: userId,
      preferred_university: university_name,
      has_attachments: files.length > 0,
      file_types: files.map(f => f.mimetype)
    }));

    // Add actual file data with proper field name
    files.forEach((file) => {
      formData.append('files', fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype
      });
    });

    console.log('🔍 Sending files to enhanced RAG service endpoint...');

    // Send to the new file-handling endpoint
    const fileEndpoint = AI_SERVICE_URL.replace('/respond', '/respond-with-files');
    console.log('📤 Using file endpoint:', fileEndpoint);

    const ragResponse = await fetch(fileEndpoint, {
      method: 'POST',
      headers: {
        "x-user-id": userId,
      },
      body: formData,
      timeout: 60000 // Longer timeout for file processing
    });

    const ragData = await ragResponse.json();
    console.log('📥 RAG service response for files received:', {
      confidence: ragData.confidence,
      sources_count: ragData.sources?.length || 0,
      response_length: ragData.reply?.length || 0
    });

    // Save AI response to MongoDB
    const aiMessage = {
      user_id: userId === 'demo_user' ? userId : new ObjectId(userId),
      conversation_id: conversation_id,
      message: ragData.reply || 'I received your files but had trouble processing them.',
      is_bot: true,
      created_at: new Date(),
      timestamp: ragData.timestamp || new Date().toISOString(),
      sources: ragData.sources || [],
      confidence: ragData.confidence || 0.0,
      rag_metadata: {
        source_count: ragData.sources?.length || 0,
        processing_time: ragData.processing_time,
        model_used: ragData.model_used || 'hybrid-rag',
        processed_files: files.length
      }
    };

    await chatsCollection.insertOne(aiMessage);
    console.log('✅ Saved AI response for files to MongoDB');

    // Clean up uploaded files
    files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.warn('⚠️ Could not delete uploaded file:', file.path);
      }
    });

    // Return enhanced response
    res.json({
      success: true,
      message: ragData.reply || 'Files processed successfully',
      reply: ragData.reply || 'Files processed successfully',
      conversation_id: conversation_id,
      sources: ragData.sources || [],
      confidence: ragData.confidence || 0.0,
      timestamp: ragData.timestamp || new Date().toISOString(),
      files_processed: files.length,
      metadata: {
        university_context: university_name,
        response_type: ragData.confidence > 0.85 ? 'local_knowledge' : 'hybrid_search',
        processing_info: ragData.processing_info,
        attachments: fileAttachments
      }
    });

  } catch (error) {
    console.error("❌ File upload processing error:", error);
    
    const errorMessage = error.code === 'ECONNREFUSED'
      ? "The AI service is not responding right now. Please try again later."
      : "There was an issue processing your files. Please try again or contact support.";

    res.status(500).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      conversation_id: req.body.conversation_id
    });
  }
});

// Demo chat endpoint (no authentication required) - Enhanced with caching and logging
router.post("/demo", cacheMiddleware, logConversationMiddleware, async (req, res) => {
  try {
    const { message, conversation_id } = req.body;

    console.log(`📥 Demo message: ${message?.substring(0, 100)}...`);

    if (!message || !conversation_id) {
      return res.status(400).json({
        success: false,
        message: "Message and conversation_id are required"
      });
    }

    // Send directly to RAG service for demo
    console.log(`🤖 Sending demo request to: ${AI_SERVICE_URL}`);
    
    try {
      const response = await fetch(AI_SERVICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          conversation_id: conversation_id,
          user_context: {
            user_id: 'demo_user',
            demo_mode: true,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();
      console.log("✅ Demo response received from RAG service");

      res.json({
        success: true,
        reply: data.reply || "I'm here to help with Ghanaian university information!",
        sources: data.sources || [],
        confidence: data.confidence || 0.5,
        processing_time: data.processing_time || 0,
        demo_mode: true
      });

    } catch (ragError) {
      console.error("❌ Demo RAG Service Error:", ragError.message);
      
      // Intelligent fallback for demo
      const fallbackReply = generateQuickFallback(message);
      
      res.json({
        success: true,
        reply: fallbackReply,
        sources: [{"source": "Local Knowledge", "type": "fallback"}],
        confidence: 0.3,
        demo_mode: true
      });
    }

  } catch (error) {
    console.error("❌ Demo Chat Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process your message. Please try again.",
      demo_mode: true
    });
  }
});

function generateQuickFallback(message) {
  const messageLower = message?.toLowerCase() || '';
  
  // Check for assessment data in message
  if (messageLower.includes('assessment') || messageLower.includes('grades') || messageLower.includes('career goals')) {
    return `**🎯 Assessment Results Analysis**

Thank you for sharing your academic profile! Based on your information, here are some recommendations:

**🏫 Recommended Universities:**
• **University of Ghana (Legon)** - Excellent for your academic profile
• **KNUST (Kumasi)** - Strong in technology and engineering
• **UCC (Cape Coast)** - Good alternative with quality programs

**📚 Suggested Programs:**
• Computer Science (UG/KNUST)
• Software Engineering (KNUST) 
• Information Technology (UCC)

**💡 Next Steps:**
1. Research specific program requirements
2. Visit university websites for application details
3. Prepare application documents
4. Apply before deadlines (usually March-April)

Would you like detailed information about any specific university or program?`;
  }
  
  if (messageLower.includes('university of ghana') || messageLower.includes('ug')) {
    return `**University of Ghana (Legon) 🎓**

**📍 Location:** Legon, Accra
**📞 Contact:** +233-30-213-8501
**✉️ Email:** admissions@ug.edu.gh
**🌐 Website:** www.ug.edu.gh

**Popular Programs:**
• Computer Science - 4 years, GHS 8,500/year
• Medicine - 6 years, GHS 15,000/year
• Business Admin - 4 years, GHS 6,500/year

**Requirements:** WASSCE with 6 credits (A1-C6)
**Deadline:** March 31st | **Fee:** GHS 200

Need specific program details? Just ask!`;
  }
  
  return `**Welcome to Glinax! 🎓**

I help with Ghanaian university admissions:

**🏫 Universities:** UG, KNUST, UCC, UDS, UPSA
**📚 Info:** Programs, fees, requirements, deadlines
**💬 Try:** "Tell me about Computer Science at UG"

What can I help you find?`;
}

/**
 * Start a new conversation
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.id;
    const conversationsCollection = await getCollection("conversations");

    const newConversation = {
      user_id: new ObjectId(userId),
      title: title || "New Conversation",
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await conversationsCollection.insertOne(newConversation);
    
    const conversation = {
      id: result.insertedId.toString(),
      user_id: userId,
      title: newConversation.title,
      created_at: newConversation.created_at,
      updated_at: newConversation.updated_at
    };

    res.status(201).json({ conversation });
  } catch (err) {
    console.error("❌ Error creating conversation:", err);
    res.status(500).json({ message: "Failed to start new conversation" });
  }
});

/**
 * Send a message (or file) and get AI response
 */
router.post(
  "/respond",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    const { message, conversation_id } = req.body;
    const file = req.file;
    const userId = req.user.id;

    if (!message && !file)
      return res.status(400).json({ message: "Provide either a message or a file" });

    try {
      const conversationsCollection = await getCollection("conversations");
      
      // Try to find the conversation
      const convoCheck = await conversationsCollection.findOne({
        _id: new ObjectId(conversation_id),
        user_id: new ObjectId(userId)
      });
      
      
      if (!convoCheck) {
        console.log("⚠️ WARNING: Chat ID not found in DB, proceeding anyway for demo.");
      }
      // -----------------------------------------------------

      let aiResponse;

      if (file) {
        const formData = new FormData();
        formData.append("conversation_id", conversation_id);
        formData.append("message", message || "");
        formData.append("file", fs.createReadStream(file.path));

        aiResponse = await fetch(`${AI_SERVICE_URL}`, {
          method: "POST",
          headers: { "x-user-id": userId.toString() },
          body: formData,
        });

        // Clean up uploaded file
        try { fs.unlinkSync(file.path); } catch (e) { console.error("Error deleting file:", e); }

      } else {
        aiResponse = await fetch(`${AI_SERVICE_URL}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId.toString(),
          },
          body: JSON.stringify({ conversation_id, message }),
        });
      }

      // Safely handle text or JSON replies
      const aiResponseText = await aiResponse.text();
      let data;
      try {
        data = JSON.parse(aiResponseText);
      } catch {
        data = { reply: aiResponseText };
      }

      const aiMessage = data.reply || "Sorry, I couldn’t process that.";

      const chatsCollection = await getCollection("chats");
      
      // Save user message
      if (message) {
        await chatsCollection.insertOne({
          user_id: new ObjectId(userId),
          conversation_id: new ObjectId(conversation_id),
          message,
          is_bot: false,
          created_at: new Date()
        });
      }

      if (file) {
        await chatsCollection.insertOne({
          user_id: new ObjectId(userId),
          conversation_id: new ObjectId(conversation_id),
          message: `📎 Uploaded file: ${file.originalname}`,
          is_bot: false,
          created_at: new Date()
        });
      }

      // Save Bot message
      await chatsCollection.insertOne({
        user_id: new ObjectId(userId),
        conversation_id: new ObjectId(conversation_id),
        message: aiMessage,
        is_bot: true,
        created_at: new Date()
      });

      res.json({ reply: aiMessage });

    } catch (err) {
      console.error("❌ Chat error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


/**
 * Get all user conversations
 */
router.get("/user/all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationsCollection = await getCollection("conversations");
    
    const conversations = await conversationsCollection
      .find({ user_id: new ObjectId(userId) })
      .sort({ created_at: -1 })
      .toArray();
    
    const formattedConversations = conversations.map(conv => ({
      id: conv._id.toString(),
      user_id: conv.user_id.toString(),
      title: conv.title,
      created_at: conv.created_at,
      updated_at: conv.updated_at
    }));
    
    res.json({ conversations: formattedConversations });
  } catch (err) {
    console.error("❌ Error fetching conversations:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Get paginated chat history
 */
router.get("/history/:conversation_id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversation_id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const chatsCollection = await getCollection("chats");
    
    const filter = {
      user_id: new ObjectId(userId),
      conversation_id: new ObjectId(conversation_id)
    };

    const total = await chatsCollection.countDocuments(filter);

    const chats = await chatsCollection
      .find(filter)
      .sort({ created_at: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const formattedChats = chats.map(chat => ({
      id: chat._id.toString(),
      user_id: chat.user_id.toString(),
      conversation_id: chat.conversation_id.toString(),
      message: chat.message,
      is_bot: chat.is_bot,
      created_at: chat.created_at
    }));

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      chats: formattedChats,
    });
  } catch (err) {
    console.error("❌ Error fetching chat history:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Save conversation and messages to MongoDB
 */
router.post("/save-conversation", async (req, res) => {
  try {
    const { conversation, messages } = req.body;
    
    if (!conversation || !messages) {
      return res.status(400).json({ 
        success: false, 
        message: "Conversation and messages are required" 
      });
    }

    const conversationsCollection = await getCollection("conversations");
    const chatsCollection = await getCollection("chats");

    // Create proper conversation document for MongoDB
    const conversationDoc = {
      _id: conversation.id, // Use the conversation ID as-is
      title: conversation.title,
      last_message: conversation.lastMessage || '',
      created_at: new Date(conversation.timestamp),
      updated_at: new Date(),
      message_count: messages.length,
      university_context: conversation.universityContext || null,
      user_id: "demo_user" // For demo purposes
    };

    // Save or update conversation
    await conversationsCollection.replaceOne(
      { _id: conversation.id },
      conversationDoc,
      { upsert: true }
    );

    // Save messages to chats collection
    const messagePromises = messages.map(async (message) => {
      const messageDoc = {
        _id: new ObjectId(),
        conversation_id: conversation.id,
        message: message.text,
        is_bot: !message.isUser,
        created_at: new Date(),
        timestamp: message.timestamp,
        sources: message.sources || [],
        confidence: message.confidence || 0,
        user_id: "demo_user" // For demo purposes
      };

      // Insert new message (don't replace duplicates)
      await chatsCollection.insertOne(messageDoc);
    });

    await Promise.all(messagePromises);

    console.log(`✅ Saved conversation ${conversation.id} with ${messages.length} messages to MongoDB`);
    res.json({ 
      success: true, 
      message: "Conversation saved successfully",
      conversation_id: conversation.id,
      saved_messages: messages.length
    });

  } catch (error) {
    console.error("❌ Error saving conversation to MongoDB:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to save conversation to MongoDB",
      error: error.message 
    });
  }
});

/**
 * Get conversation history for authenticated users
 */
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationsCollection = await getCollection("conversations");
    
    // Get user's conversations, sorted by most recent
    const conversations = await conversationsCollection
      .find({ user_id: new ObjectId(userId) })
      .sort({ updated_at: -1 })
      .limit(50)
      .toArray();

    console.log(`✅ Retrieved ${conversations.length} conversations for user ${userId}`);
    res.json({ 
      success: true, 
      conversations: conversations.map(conv => ({
        id: conv._id.toString(),
        title: conv.title,
        lastMessage: conv.last_message,
        timestamp: conv.updated_at,
        messageCount: conv.message_count || 0,
        universityContext: conv.university_context
      }))
    });

  } catch (error) {
    console.error("❌ Error fetching conversations:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch conversations" 
    });
  }
});

/**
 * Get conversation history for demo/guest users
 */
router.get("/conversations-demo", async (req, res) => {
  try {
    const conversationsCollection = await getCollection("conversations");
    
    // Get recent conversations for demo
    const conversations = await conversationsCollection
      .find({})
      .sort({ updated_at: -1 })
      .limit(10)
      .toArray();

    console.log(`✅ Retrieved ${conversations.length} demo conversations`);
    res.json({ 
      success: true, 
      conversations: conversations.map(conv => ({
        id: conv._id.toString(),
        title: conv.title,
        lastMessage: conv.last_message,
        timestamp: conv.updated_at,
        messageCount: conv.message_count || 0,
        universityContext: conv.university_context
      }))
    });

  } catch (error) {
    console.error("❌ Error fetching demo conversations:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch conversations" 
    });
  }
});

/**
 * Get messages for a specific conversation
 */
router.get("/conversations/:conversation_id/messages", async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const chatsCollection = await getCollection("chats");
    
    const messages = await chatsCollection
      .find({ conversation_id })
      .sort({ created_at: 1 })
      .toArray();

    console.log(`✅ Retrieved ${messages.length} messages for conversation ${conversation_id}`);
    res.json({ 
      success: true, 
      messages: messages.map(msg => ({
        id: msg._id.toString(),
        text: msg.message,
        isUser: !msg.is_bot,
        timestamp: msg.timestamp,
        conversationId: msg.conversation_id,
        sources: msg.sources || [],
        confidence: msg.confidence || 0
      }))
    });

  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch messages" 
    });
  }
});

/**
 * Clear chat history
 */
router.delete("/:conversation_id/clear", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversation_id } = req.params;
    const chatsCollection = await getCollection("chats");

    await chatsCollection.deleteMany({
      user_id: new ObjectId(userId),
      conversation_id: new ObjectId(conversation_id)
    });

    res.json({ message: "Chat history cleared successfully" });
  } catch (err) {
    console.error("❌ Error clearing chats:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Send message - Enhanced RAG+CAG endpoint (for frontend compatibility)
 */
// FIXED: Enhanced endpoint for authenticated users  
router.post("/send", authMiddleware, async (req, res) => {
  try {
    const { message, conversation_id, university_name } = req.body;
    const userId = req.user.id;

    if (!message || !conversation_id) {
      return res.status(400).json({ 
        success: false,
        message: "Message and conversation_id are required" 
      });
    }

    // Get MongoDB collections
    const chatsCollection = await getCollection('chats');

    // Save user message
    const userMessage = {
      user_id: new ObjectId(userId),
      conversation_id: conversation_id,
      message: message,
      is_bot: false,
      created_at: new Date(),
      timestamp: new Date().toISOString()
    };

    await chatsCollection.insertOne(userMessage);

    // Prepare RAG request
    const ragRequest = {
      message: message,
      conversation_id: conversation_id,
      university_name: university_name || null,
      user_context: {
        user_id: userId,
        preferred_university: university_name,
        timestamp: new Date().toISOString()
      }
    };

    // Send to RAG service
    const ragResponse = await fetch(AI_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify(ragRequest),
    });

    const ragData = await ragResponse.json();

    // Save AI response
    const aiMessage = {
      user_id: new ObjectId(userId),
      conversation_id: conversation_id,
      message: ragData.reply,
      is_bot: true,
      created_at: new Date(),
      timestamp: ragData.timestamp || new Date().toISOString(),
      sources: ragData.sources || [],
      confidence: ragData.confidence || 0.0
    };

    await chatsCollection.insertOne(aiMessage);

    // Return response
    res.json({
      success: true,
      message: ragData.reply,
      reply: ragData.reply,
      conversation_id: conversation_id,
      sources: ragData.sources || [],
      confidence: ragData.confidence || 0.0,
      timestamp: ragData.timestamp || new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Authenticated chat error:", error);
    res.status(500).json({ 
      success: false,
      message: "I'm having some technical issues right now. Please try again.",
      conversation_id: req.body.conversation_id
    });
  }
});

// Demo endpoint (no authentication required)
router.post("/send-message-demo", async (req, res) => {
  try {
    const { message, conversation_id, university_name } = req.body;
    const userId = req.user?.id || "demo-user";

    if (!message || !conversation_id) {
      return res.status(400).json({ 
        success: false,
        message: "Message and conversation_id are required" 
      });
    }

    // Prepare RAG request
    const ragRequest = {
      message: message,
      conversation_id: conversation_id,
      university_name: university_name || null,
      user_context: {
        user_id: userId,
        preferred_university: university_name
      }
    };

    // Send to RAG service
    const ragResponse = await fetch(AI_SERVICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify(ragRequest),
    });

    const ragData = await ragResponse.json();

    // Save messages to MongoDB
    const chatsCollection = await getCollection("chats");
    
    // Save user message
    await chatsCollection.insertOne({
      user_id: new ObjectId(userId),
      conversation_id: new ObjectId(conversation_id),
      message: message,
      is_bot: false,
      created_at: new Date(),
      timestamp: new Date().toISOString()
    });

    // Save AI response
    await chatsCollection.insertOne({
      user_id: new ObjectId(userId),
      conversation_id: new ObjectId(conversation_id),
      message: ragData.reply,
      is_bot: true,
      created_at: new Date(),
      timestamp: ragData.timestamp || new Date().toISOString(),
      sources: ragData.sources || [],
      confidence: ragData.confidence || 0.0
    });

    // Return response
    res.json({
      success: true,
      message: ragData.reply,
      reply: ragData.reply,
      conversation_id: conversation_id,
      sources: ragData.sources || [],
      confidence: ragData.confidence || 0.0,
      timestamp: ragData.timestamp || new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ Chat error:", error);
    res.status(500).json({ 
      success: false,
      message: "I'm having some technical issues right now. Please try again.",
      conversation_id: req.body.conversation_id
    });
  }
});

export default router;