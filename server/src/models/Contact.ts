import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IContact extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  phoneNumber: string;
  jid: string;
  lid?: string;
  name: string;
  avatarUrl?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    phoneNumber: { type: String, required: true },
    jid: { type: String, required: true, index: true },
    lid: { type: String, index: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    notes: { type: String },
    tags: [{ type: String }]
  },
  {
    timestamps: true
  }
);

ContactSchema.index({ userId: 1, jid: 1 }, { unique: true });
ContactSchema.index({ userId: 1, phoneNumber: 1 });
ContactSchema.index({ userId: 1, name: 1 });

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
