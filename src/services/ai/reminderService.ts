import { reminderTemplate } from '../../constants/reminderTemplates'

export const createReminder = (name: string, remaining: number, dueDate: string) =>
  reminderTemplate(name, remaining, dueDate)
