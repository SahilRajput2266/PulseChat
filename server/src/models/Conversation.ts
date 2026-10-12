import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  jid: string;
  lid?: string;
  phoneNumber: string;
  name: string;
  avatarUrl?: string;
  unreadCount: number;
  lastMessagePreview?: string;
  lastMessageTimestamp?: Date;
  lastMessageStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  lastMessageDirection?: 'inbound' | 'outbound';
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jid: { type: String, required: true, index: true },
    lid: { type: String, index: true },
    phoneNumber: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    unreadCount: { type: Number, default: 0 },
    lastMessagePreview: { type: String },
    lastMessageTimestamp: { type: Date, default: Date.now },
    lastMessageStatus: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    lastMessageDirection: {
      type: String,
      enum: ['inbound', 'outbound'],
      default: 'outbound'
    }
  },
  {
    timestamps: true
  }
);

ConversationSchema.index({ userId: 1, jid: 1 }, { unique: true });
ConversationSchema.index({ userId: 1, lastMessageTimestamp: -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
