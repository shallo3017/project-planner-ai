import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/**
 * ai_documents — the PRD / TRD generated for a project (MVP: 2 doc types).
 * `content` is Mixed: structured AI output, or markdown text for seeded demos.
 */
const aiDocumentSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    docType: { type: String, enum: ['prd', 'trd'], required: true },
    content: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, default: 1 },
    generatedBy: { type: String, default: null },
    tokensUsed: { type: Number, default: null },
    isApproved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret._id;
        return ret;
      },
    },
  },
);

// One PRD and one TRD per project.
aiDocumentSchema.index({ projectId: 1, docType: 1 }, { unique: true });

export type AiDocument = InferSchemaType<typeof aiDocumentSchema>;
export type AiDocumentDocument = HydratedDocument<AiDocument>;

export const AiDocumentModel = model('AiDocument', aiDocumentSchema);
