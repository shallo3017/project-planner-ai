import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** All document types the platform can generate for a project. */
export const DOC_TYPES = ['prd', 'trd', 'brd', 'srs', 'api_docs', 'db_schema'] as const;
export type DocType = (typeof DOC_TYPES)[number];

/**
 * ai_documents — the documents generated for a project (PRD, TRD, BRD, SRS,
 * API docs, DB schema). `content` is Mixed: AI markdown, or seeded demo text.
 */
const aiDocumentSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    docType: { type: String, enum: DOC_TYPES, required: true },
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

// One document of each type per project.
aiDocumentSchema.index({ projectId: 1, docType: 1 }, { unique: true });

export type AiDocument = InferSchemaType<typeof aiDocumentSchema>;
export type AiDocumentDocument = HydratedDocument<AiDocument>;

export const AiDocumentModel = model('AiDocument', aiDocumentSchema);
