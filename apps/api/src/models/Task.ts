import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

/** Implementation tasks tracked by the tech team for a project. */
const taskSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
    order: { type: Number, default: 0 },
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

export type Task = InferSchemaType<typeof taskSchema>;
export type TaskDocument = HydratedDocument<Task>;

export const TaskModel = model('Task', taskSchema);
