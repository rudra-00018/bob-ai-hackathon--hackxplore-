/**
 * MongoDB Schema Definitions (for reference / Mongoose usage)
 * Collections: predictions, users
 */

// predictions collection
const predictionSchema = {
  user_id:      String,       // user identifier
  prediction:   String,       // e.g. "plastic"
  confidence:   Number,       // 0.0 - 1.0
  top3: [{
    label:      String,
    confidence: Number,
  }],
  recyclable:   Boolean,
  carbon_saved: Number,       // kg CO2
  timestamp:    Date,
}

// users collection (optional, for auth)
const userSchema = {
  user_id:       String,
  email:         String,
  total_scans:   Number,
  carbon_saved:  Number,
  badges:        [String],
  created_at:    Date,
}

// reports collection
const reportSchema = {
  id:             String,       // e.g. "report-1710000000000-abcde"
  user_id:        String,       // user identifier or id
  report_type:    String,       // "overflowing_bin" | "illegal_dumping" | "hazardous_waste" | "damaged_bin" | "fly_tipping" | "other"
  description:    String,
  location: {
    lat:          Number,
    lon:          Number,
    address:      String,
  },
  image_url:      String,       // base64 data URL or remote URL
  ai_result: {
    category:     String,
    label:        String,
    confidence:   Number,
    urgency:      String,       // "low" | "medium" | "high" | "critical"
    source:       String,
  },
  status:         String,       // "submitted" | "under_review" | "accepted" | "in_progress" | "resolved" | "rejected"
  status_history: [{
    status:       String,
    timestamp:    Date,
    note:         String,
  }],
  upvotes:        Number,
  created_at:     Date,
  updated_at:     Date,
}

// notifications collection
const notificationSchema = {
  id:             String,       // e.g. "notif-1710000000000-abcd"
  user_id:        String,
  type:           String,       // "info" | "success" | "warning" | "danger"
  title:          String,
  body:           String,
  report_id:      String,
  status:         String,
  read:           Boolean,
  created_at:     Date,
}

// Indexes to create:
// db.predictions.createIndex({ user_id: 1, timestamp: -1 })
// db.predictions.createIndex({ timestamp: -1 })
// db.reports.createIndex({ user_id: 1, created_at: -1 })
// db.reports.createIndex({ status: 1 })
// db.notifications.createIndex({ user_id: 1, created_at: -1 })

module.exports = { predictionSchema, userSchema, reportSchema, notificationSchema }

