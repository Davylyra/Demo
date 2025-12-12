/**
 * MongoDB Schema/Collections Setup for Glinax Chatbot
 * 
 * This file documents the MongoDB collections and their structure.
 * MongoDB is schema-less, but this serves as documentation.
 * 
 * Run this in MongoDB shell or use a migration tool to create indexes.
 */

// =============================================
// USERS COLLECTION
// =============================================
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ created_at: -1 });

// Example document structure:
/*
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  password_hash: "$2b$10$...",
  is_verified: false,
  verification_code: "123456",
  verification_expires: ISODate("2024-01-01T12:00:00Z"),
  otp_code: "123456",
  otp_expires_at: ISODate("2024-01-01T12:00:00Z"),
  created_at: ISODate("2024-01-01T10:00:00Z"),
  updated_at: ISODate("2024-01-01T10:00:00Z")
}
*/

// =============================================
// CONVERSATIONS COLLECTION
// =============================================
db.conversations.createIndex({ user_id: 1, created_at: -1 });
db.conversations.createIndex({ user_id: 1 });

// Example document structure:
/*
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  title: "New Conversation",
  created_at: ISODate("2024-01-01T10:00:00Z"),
  updated_at: ISODate("2024-01-01T10:00:00Z")
}
*/

// =============================================
// CHATS COLLECTION (Messages)
// =============================================
db.chats.createIndex({ user_id: 1, conversation_id: 1, created_at: 1 });
db.chats.createIndex({ conversation_id: 1, created_at: 1 });
db.chats.createIndex({ user_id: 1 });

// Example document structure:
/*
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  conversation_id: ObjectId("..."),
  message: "Hello, I need help with admission",
  is_bot: false,
  created_at: ISODate("2024-01-01T10:00:00Z")
}
*/

// =============================================
// FORMS COLLECTION
// =============================================
db.forms.createIndex({ university_name: 1 });
db.forms.createIndex({ is_available: 1 });
db.forms.createIndex({ created_at: -1 });

// Example document structure:
/*
{
  _id: ObjectId("..."),
  name: "KNUST Undergraduate Application Form",
  university_name: "Kwame Nkrumah University of Science and Technology (KNUST)",
  description: "Application form for undergraduate programs",
  price: 150.00,
  deadline: ISODate("2025-08-31T00:00:00Z"),
  is_available: true,
  requirements: "WASSCE certificate, Birth certificate, Passport photos",
  created_at: ISODate("2024-01-01T10:00:00Z"),
  updated_at: ISODate("2024-01-01T10:00:00Z")
}
*/

// =============================================
// PAYMENTS COLLECTION
// =============================================
db.payments.createIndex({ user_id: 1, created_at: -1 });
db.payments.createIndex({ reference: 1 }, { unique: true });
db.payments.createIndex({ status: 1 });

// Example document structure:
/*
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  form_id: ObjectId("..."),
  amount: 15000, // in pesewas
  reference: "FORM_123_1234567890_456",
  status: "pending", // pending, success, failed
  payment_method: "paystack",
  created_at: ISODate("2024-01-01T10:00:00Z"),
  updated_at: ISODate("2024-01-01T10:00:00Z")
}
*/

// =============================================
// USER_FORMS COLLECTION
// =============================================
db.user_forms.createIndex({ user_id: 1, form_id: 1 }, { unique: true });
db.user_forms.createIndex({ user_id: 1, purchase_date: -1 });
db.user_forms.createIndex({ form_id: 1 });

// Example document structure:
/*
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  form_id: ObjectId("..."),
  payment_id: ObjectId("..."),
  purchase_date: ISODate("2024-01-01T10:00:00Z")
}
*/

// =============================================
// NOTIFICATIONS COLLECTION
// =============================================
db.notifications.createIndex({ user_id: 1, is_read: 1, created_at: -1 });
db.notifications.createIndex({ user_id: 1 });

// Example document structure:
/*
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  title: "Form Purchase Successful",
  message: "Your KNUST admission form has been purchased successfully.",
  type: "success", // info, warning, success, error
  is_read: false,
  created_at: ISODate("2024-01-01T10:00:00Z")
}
*/

// =============================================
// INSERT SAMPLE FORMS DATA
// =============================================
db.forms.insertMany([
  {
    name: "KNUST Undergraduate Application Form",
    university_name: "Kwame Nkrumah University of Science and Technology (KNUST)",
    description: "Application form for undergraduate programs at KNUST for 2024/2025 academic year",
    price: 150.00,
    deadline: ISODate("2025-08-31T00:00:00Z"),
    is_available: true,
    requirements: "WASSCE certificate, Birth certificate, Passport photos",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "UCC Undergraduate Application Form",
    university_name: "University of Cape Coast (UCC)",
    description: "Application form for undergraduate programs at UCC for 2024/2025 academic year",
    price: 120.00,
    deadline: ISODate("2025-08-31T00:00:00Z"),
    is_available: true,
    requirements: "WASSCE certificate, Birth certificate, Passport photos",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "UG Undergraduate Application Form",
    university_name: "University of Ghana (UG)",
    description: "Application form for undergraduate programs at UG for 2024/2025 academic year",
    price: 180.00,
    deadline: ISODate("2025-08-31T00:00:00Z"),
    is_available: true,
    requirements: "WASSCE certificate, Birth certificate, Passport photos",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "UHAS Undergraduate Application Form",
    university_name: "University of Health and Allied Sciences (UHAS)",
    description: "Application form for undergraduate programs at UHAS for 2024/2025 academic year",
    price: 150.00,
    deadline: ISODate("2025-08-31T00:00:00Z"),
    is_available: true,
    requirements: "WASSCE certificate, Birth certificate, Passport photos",
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    name: "Ashesi University Application Form",
    university_name: "Ashesi University",
    description: "Application form for undergraduate programs at Ashesi University for 2024/2025 academic year",
    price: 200.00,
    deadline: ISODate("2025-08-31T00:00:00Z"),
    is_available: true,
    requirements: "WASSCE certificate, Personal statement, Recommendation letters",
    created_at: new Date(),
    updated_at: new Date()
  }
]);

