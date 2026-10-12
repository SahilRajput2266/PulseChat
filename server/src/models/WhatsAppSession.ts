import mongoose, { Document, Schema, Types } from 'mongoose';

export type WhatsAppSessionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface IWhatsAppSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  status: WhatsAppSessionStatus;
  phoneNumber?: string;
  pushName?: string;
  jid?: string;
  qrCode?: string; // Base64 data URL for display
  qrExpiresAt?: Date;
  lastConnectedAt?: Date;
  disconnectReason?: string;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema = new Schema<IWhatsAppSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['disconnected', 'connecting', 'connected', 'error'],
      default: 'disconnected',
      index: true
    },
    phoneNumber: { type: String },
    pushName: { type: String },
    jid: { type: String },
    qrCode: { type: String },
    qrExpiresAt: { type: Date },
    lastConnectedAt: { type: Date },
    disconnectReason: { type: String },
    lastError: { type: String }
  },
  {
    timestamps: true
  }
);

export const WhatsAppSession = mongoose.model<IWhatsAppSession>('WhatsAppSession', WhatsAppSessionSchema);
