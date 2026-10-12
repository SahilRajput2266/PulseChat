import mongoose, { Document, Schema, Types } from 'mongoose';

export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  conversationId: Types.ObjectId;
  jid: string;
  messageId: string; // Baileys message key id
  direction: MessageDirection;
  text: string;
  status: MessageStatus;
  timestamp: Date;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    jid: { type: String, required: true, index: true },
    messageId: { type: String, required: true, index: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    text: { type: String, required: true },
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
      default: 'sending',
      index: true
    },
    timestamp: { type: Date, default: Date.now, index: true },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 }
  },
  {
    timestamps: true
  }
);

MessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });
MessageSchema.index({ conversationId: 1, timestamp: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
