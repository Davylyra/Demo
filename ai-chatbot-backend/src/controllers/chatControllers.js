import { getCollection } from "../config/db.js";
import axios from "axios";
import { ObjectId } from "mongodb";
import multer from "multer";
import fs from "fs";
import path from "path";

// 🧩 Get all chats for logged-in user
export const getAllChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const chatsCollection = await getCollection("chats");
    
    const chats = await chatsCollection
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ 
      success: true, 
      data: chats.map(chat => ({
        id: chat._id.toString(),
        title: chat.title,
        created_at: chat.createdAt
      }))
    });
  } catch (error) {
    console.error("Get chats error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch chats" 
    });
  }
};

// 🧩 Create a new chat
export const createChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    const chatsCollection = await getCollection("chats");
    
    const newChat = {
      userId: userId,
      title: title || "New Chat",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await chatsCollection.insertOne(newChat);

    res.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        title: newChat.title,
        created_at: newChat.createdAt
      }
    });
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create chat" 
    });
  }
};

// 🧩 Get messages in a specific chat
export const getChatMessages = async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;

    const messagesCollection = await getCollection("messages");
    
    const messages = await messagesCollection
      .find({ 
        chatId: chatId, 
        userId: userId 
      })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      success: true,
      data: messages.map(msg => ({
        id: msg._id.toString(),
        message: msg.message,
        is_bot: msg.isBot,
        created_at: msg.createdAt
      }))
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch messages" 
    });
  }
};

// 🧩 Enhanced RAG+CAG Message Processing
export const sendMessageToRag = async (req, res) => {
  try {
    const { message, conversation_id, university_name } = req.body;
    const userId = req.user.id;

    console.log('📤 Processing enhanced RAG request:', { 
      message: message?.substring(0, 100), 
      conversation_id, 
      university_name,
      userId 
    });

    if (!message || !conversation_id) {
      return res.status(400).json({ 
        success: false,
        message: "Message and conversation_id are required" 
      });
    }

    // Get MongoDB collections
    const chatsCollection = await getCollection('chats');
    const messagesCollection = await getCollection('messages');

    // Ensure conversation exists
    // Use string IDs unless a valid 24-hex string is provided
    let conversationKey = conversation_id;
    if (/^[a-fA-F0-9]{24}$/.test(conversation_id)) {
      try {
        conversationKey = new ObjectId(conversation_id);
      } catch {
        conversationKey = conversation_id; // fallback to plain string
      }
    }

    // Save user message to MongoDB
    const userMessage = {
      user_id: userId, // store as plain string
      conversation_id: conversationKey,
      message: message,
      is_bot: false,
      created_at: new Date(),
      timestamp: new Date().toISOString()
    };

    await messagesCollection.insertOne(userMessage);
    console.log('✅ Saved user message to MongoDB');

    // Prepare enhanced RAG request
    const ragRequest = {
      message: message,
      conversation_id: conversation_id,
      university_name: university_name || null,
      user_context: {
        user_id: userId,
        preferred_university: university_name,
        conversation_history_length: await messagesCollection.countDocuments({
          conversation_id: conversationObjectId
        })
      }
    };

    console.log('🔍 Sending to enhanced RAG service...');

    // Send to enhanced RAG Python service
    const ragResponse = await axios.post(process.env.AI_SERVICE_URL || "http://localhost:8000/respond", ragRequest, {
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      timeout: 30000 // 30 second timeout
    });

    const ragData = ragResponse.data;
    console.log('📥 RAG service response received:', {
      confidence: ragData.confidence,
      sources_count: ragData.sources?.length || 0,
      response_length: ragData.reply?.length || 0
    });

    // Save AI response to MongoDB
    const aiMessage = {
      user_id: userId,
      conversation_id: conversationKey,
      message: ragData.reply,
      is_bot: true,
      created_at: new Date(),
      timestamp: ragData.timestamp || new Date().toISOString(),
      sources: ragData.sources || [],
      confidence: ragData.confidence || 0.0,
      rag_metadata: {
        source_count: ragData.sources?.length || 0,
        processing_time: ragData.processing_time,
        model_used: ragData.model_used || 'hybrid-rag'
      }
    };

    await messagesCollection.insertOne(aiMessage);
    console.log('✅ Saved AI response to MongoDB');

    // Update conversation metadata
    await chatsCollection.updateOne(
      { 
        user_id: userId, 
        conversation_id: conversationKey 
      },
      {
        $set: {
          last_message: ragData.reply.substring(0, 100),
          last_updated: new Date(),
          message_count: await messagesCollection.countDocuments({
            conversation_id: conversationObjectId
          })
        }
      },
      { upsert: true }
    );

    // Return enhanced response
    res.json({
      success: true,
      message: ragData.reply,
      reply: ragData.reply, // For backward compatibility
      conversation_id: conversation_id,
      sources: ragData.sources || [],
      confidence: ragData.confidence || 0.0,
      timestamp: ragData.timestamp || new Date().toISOString(),
      metadata: {
        university_context: university_name,
        response_type: ragData.confidence > 0.85 ? 'local_knowledge' : 'hybrid_search',
        processing_info: ragData.processing_info
      }
    });

  } catch (error) {
    console.error("❌ Enhanced RAG processing error:", error);
    
    // Provide user-friendly error message in Ghanaian English
    const errorMessage = error.response?.status === 500 
      ? "Ei, the AI service dey down small. Please try again in a few minutes."
      : error.response?.status === 404
      ? "I no fit find the information you dey look for. Please try a different question."
      : error.code === 'ECONNREFUSED'
      ? "The AI service no dey respond right now. Please try again later."
      : "I get some technical wahala right now. Please try again or contact support.";

    res.status(error.response?.status || 500).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      conversation_id: req.body.conversation_id
    });
  }
};

// 🧩 Demo chat endpoint (no authentication required)
export const sendDemoMessage = async (req, res) => {
  try {
    const { message, conversation_id } = req.body;

    console.log(`📥 Demo message: ${message.substring(0, 100)}...`);

    if (!message || !conversation_id) {
      return res.status(400).json({
        success: false,
        message: "Message and conversation_id are required"
      });
    }

    // Send directly to RAG service for demo
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    console.log(`🤖 Sending demo request to: ${aiServiceUrl}/respond`);
    
    try {
      const response = await axios.post(`${aiServiceUrl}/respond`, {
        message,
        conversation_id: conversation_id,
        user_context: {
          user_id: 'demo_user',
          demo_mode: true,
          timestamp: new Date().toISOString()
        }
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("✅ Demo response received from RAG service");

      res.json({
        success: true,
        reply: response.data.reply || "I'm here to help with Ghanaian university information!",
        sources: response.data.sources || [],
        confidence: response.data.confidence || 0.5,
        processing_time: response.data.processing_time || 0,
        demo_mode: true
      });

    } catch (ragError) {
      console.error("❌ Demo RAG Service Error:", ragError.message);
      
      // Intelligent fallback for demo
      const fallbackReply = generateDemoFallbackResponse(message);
      
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
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './uploads/';
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: function (req, file, cb) {
    // Allow images, documents, and PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|rtf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are allowed!'));
    }
  }
});

// 🧩 Send message with file attachments
export const sendMessageWithFiles = async (req, res) => {
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
    const messagesCollection = await getCollection('messages');

    // Ensure conversation exists
    // Use string IDs unless a valid 24-hex string is provided
    let conversationKey = conversation_id;
    if (/^[a-fA-F0-9]{24}$/.test(conversation_id)) {
      try {
        conversationKey = new ObjectId(conversation_id);
      } catch {
        conversationKey = conversation_id;
      }
    }

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
      user_id: userId, // store as plain string (even for demo)
      conversation_id: conversationKey,
      message: messageText,
      is_bot: false,
      created_at: new Date(),
      timestamp: new Date().toISOString(),
      attachments: fileAttachments
    };

    await messagesCollection.insertOne(userMessage);
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
        file_types: files.map(f => f.mimetype),
        conversation_history_length: await messagesCollection.countDocuments({
          conversation_id: conversationObjectId
        })
      }
    };

    console.log('🔍 Sending message with files to RAG service...');

    // Send to RAG Python service
    const ragResponse = await axios.post(
      process.env.AI_SERVICE_URL || "http://localhost:8000/respond", 
      ragRequest, 
      {
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        timeout: 30000
      }
    );

    const ragData = ragResponse.data;
    console.log('📥 RAG service response for files received:', {
      confidence: ragData.confidence,
      sources_count: ragData.sources?.length || 0,
      response_length: ragData.reply?.length || 0
    });

    // Save AI response to MongoDB
    const aiMessage = {
      user_id: userId,
      conversation_id: conversationKey,
      message: ragData.reply,
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

    await messagesCollection.insertOne(aiMessage);
    console.log('✅ Saved AI response for files to MongoDB');

    // Update conversation metadata
    await chatsCollection.updateOne(
      { 
        user_id: userId, 
        conversation_id: conversationKey 
      },
      {
        $set: {
          last_message: ragData.reply.substring(0, 100),
          last_updated: new Date(),
          message_count: await messagesCollection.countDocuments({
            conversation_id: conversationObjectId
          }),
          has_attachments: true
        }
      },
      { upsert: true }
    );

    // Return enhanced response
    res.json({
      success: true,
      message: ragData.reply,
      reply: ragData.reply,
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
    
    const errorMessage = error.response?.status === 500 
      ? "The AI service is having trouble processing your files. Please try again."
      : error.response?.status === 404
      ? "I couldn't process the information in your files. Please try a different format."
      : error.code === 'ECONNREFUSED'
      ? "The AI service is not responding right now. Please try again later."
      : "There was an issue processing your files. Please try again or contact support.";

    res.status(error.response?.status || 500).json({ 
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      conversation_id: req.body.conversation_id
    });
  }
};

// GET /api/history/:userId
export const getHistory = async (req, res) => {
  const { userId } = req.params;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
  }
  try {
    const messagesCollection = await getCollection('messages');
    const pipeline = [
      { $match: { user_id: userId } },
      { $sort: { conversation_id: 1, timestamp: 1 } },
      { $group: {
          _id: '$conversation_id',
          title: { $first: '$message' },
          last_active: { $max: '$timestamp' },
          message_count: { $sum: 1 }
      }},
      { $sort: { last_active: -1 } }
    ];
    const cursor = messagesCollection.aggregate(pipeline);
    const history = [];
    for await (const doc of cursor) {
      const last = doc.last_active;
      history.push({
        conversation_id: (doc._id && typeof doc._id === 'object' && doc._id.toString) ? doc._id.toString() : String(doc._id),
        title: (doc.title || 'Untitled conversation').slice(0, 120),
        last_active_date: last instanceof Date ? last.toISOString() : String(last || ''),
        message_count: Number(doc.message_count || 0)
      });
    }
    return res.json({ success: true, history });
  } catch (err) {
    console.error('❌ GetHistory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversation history' });
  }
};

// GET /api/history/details/:conversationId
export const getConversationDetails = async (req, res) => {
  const { conversationId } = req.params;
  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid conversationId parameter' });
  }
  try {
    const messagesCollection = await getCollection('messages');
    let queryConversationId = conversationId;
    if (/^[a-fA-F0-9]{24}$/.test(conversationId)) {
      try { queryConversationId = new ObjectId(conversationId); } catch { queryConversationId = conversationId; }
    }
    const cursor = messagesCollection.find({ conversation_id: queryConversationId }).sort({ timestamp: 1 });
    const messages = [];
    for await (const doc of cursor) {
      const ts = doc.timestamp;
      const tsIso = ts instanceof Date ? ts.toISOString() : String(ts || '');
      if (doc.message && doc.is_bot === false) {
        messages.push({ role: 'user', content: doc.message, timestamp: tsIso });
      } else if (doc.message && doc.is_bot === true) {
        messages.push({ role: 'assistant', content: doc.message, timestamp: tsIso, meta: { confidence: doc.confidence, sources: doc.sources || [] } });
      }
    }
    return res.json({ success: true, conversation_id: conversationId, messages });
  } catch (err) {
    console.error('❌ GetConversationDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch conversation thread' });
  }
};

// Export multer upload middleware
export const uploadMiddleware = upload.array('files', 5);

// Helper function for demo fallback responses
function generateDemoFallbackResponse(message) {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
    return `Hello! 👋 Welcome to Glinax - your AI assistant for Ghanaian university admissions!

I can help you with:
🎓 University information (UG, KNUST, UCC, UDS, etc.)
📚 Program details and requirements
💰 Fees and costs
📝 Application procedures
📞 Contact information
🎯 Scholarship opportunities

What would you like to know about Ghanaian universities?`;
  }
  
  if (messageLower.includes('university of ghana') || messageLower.includes('ug') || messageLower.includes('legon')) {
    return `**University of Ghana (Legon) 🎓**

**Location:** Legon, Accra
**Established:** 1948
**Motto:** "Integri Procedamus" (Let us proceed with integrity)

**🔥 Popular Programs:**
• **Computer Science** - 4 years, GHS 8,500/year
• **Medicine** - 6 years, GHS 15,000/year  
• **Business Administration** - 4 years, GHS 6,500/year
• **Law** - 4 years, GHS 7,500/year
• **Engineering** - 4 years, GHS 10,000/year

**📋 General Requirements:**
WASSCE with 6 credits (A1-C6) including English & Mathematics

**📞 Contact Info:**
• Phone: +233-30-213-8501
• Email: admissions@ug.edu.gh
• Website: www.ug.edu.gh

**📅 Application Deadline:** March 31st (next academic year)
**💳 Application Fee:** GHS 200

Would you like specific information about any program?`;
  }
  
  if (messageLower.includes('knust') || messageLower.includes('kumasi') || messageLower.includes('kwame nkrumah')) {
    return `**KNUST - Kwame Nkrumah University of Science and Technology 🔧**

**Location:** Kumasi, Ashanti Region
**Established:** 1952
**Motto:** "Technology for Development and Progress"

**🔥 Popular Programs:**
• **Computer Engineering** - 4 years, GHS 9,500/year
• **Civil Engineering** - 4 years, GHS 12,000/year
• **Medicine** - 6 years, GHS 18,000/year
• **Architecture** - 5 years, GHS 10,000/year
• **Mechanical Engineering** - 4 years, GHS 11,000/year

**📋 Requirements:**
WASSCE with strong Math & Science subjects (A1-C6)

**📞 Contact Info:**
• Phone: +233-32-206-0331
• Email: admissions@knust.edu.gh
• Website: www.knust.edu.gh

**📅 Application Deadline:** April 15th
**💳 Application Fee:** GHS 250

KNUST is Ghana's premier technology university! What program interests you?`;
  }
  
  if (messageLower.includes('fee') || messageLower.includes('cost') || messageLower.includes('money') || messageLower.includes('tuition')) {
    return `**💰 University Fees in Ghana (2024/2025)**

**🎓 University of Ghana:**
• Arts/Business: GHS 6,500 - 8,000/year
• Science: GHS 8,500 - 12,000/year
• Medicine: GHS 15,000/year
• Accommodation: GHS 2,500 - 4,000/year

**🔧 KNUST:**
• Engineering: GHS 9,500 - 12,000/year
• Medicine: GHS 18,000/year
• Architecture: GHS 10,000/year
• Accommodation: GHS 3,500 - 5,000/year

**🎓 UCC (Cape Coast):**
• Education: GHS 5,500 - 8,000/year
• Business: GHS 6,000 - 9,000/year
• Accommodation: GHS 2,200 - 3,500/year

**📝 Additional Costs:**
• Application fees: GHS 200 - 300
• Registration: GHS 500 - 800
• Library/Lab fees: GHS 100 - 300

**💡 Pro Tip:** Fees change annually. Always confirm current rates with university admissions offices!

Need info about a specific university or program?`;
  }
  
  // General response
  return `**Welcome to Glinax University Assistant! 🎓**

I'm here to help with Ghanaian university admissions. Here's what I can help you with:

**🏫 Top Universities:**
• University of Ghana (Legon)
• KNUST (Kumasi)  
• University of Cape Coast
• University for Development Studies (Tamale)
• UPSA (Accra)

**📚 Information I Provide:**
• Admission requirements
• Program details & duration
• Fees & costs
• Application deadlines
• Contact information
• Scholarship opportunities

**💬 Try asking:**
• "Tell me about Computer Science at UG"
• "What are KNUST engineering requirements?"
• "How much are UCC fees?"
• "When is the application deadline for UDS?"

What would you like to know? I'm here to help! 😊`;
}