import {
  Schema,
  model,
  models,
  type Model,
  type InferSchemaType,
  type HydratedDocument,
} from 'mongoose';
import { DOC_TYPES } from './AiDocument';

/**
 * An admin-authored document template. When a template is active for a doc type,
 * generation follows ITS sections and instructions instead of the built-in
 * prompt — so an admin controls the shape of every document the AI produces.
 */
const sectionSchema = new Schema(
  {
    heading: { type: String, required: true, trim: true, maxlength: 160 },
    // What the model should put in this section (the per-section brief).
    guidance: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const templateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    docType: { type: String, enum: DOC_TYPES, required: true, index: true },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    // Persona/system framing, e.g. "You are a senior product manager…".
    role: { type: String, default: '', trim: true, maxlength: 500 },
    sections: { type: [sectionSchema], default: [] },
    // Free-form house rules appended to the prompt (tone, length, must-dos).
    instructions: { type: String, default: '', trim: true, maxlength: 4000 },
    // Only one active template per docType is used (the newest wins).
    isActive: { type: Boolean, default: true, index: true },
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

export type Template = InferSchemaType<typeof templateSchema>;
export type TemplateDocument = HydratedDocument<Template>;

export const TemplateModel: Model<Template> =
  (models.Template as Model<Template>) || model<Template>('Template', templateSchema);
