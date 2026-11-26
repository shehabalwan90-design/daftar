export const reminderTemplate = (name: string, remaining: number, dueDate: string) =>
  `السلام عليكم ${name}، نذكّركم بكل لطف بأن المبلغ المتبقي من حسابكم ${remaining.toLocaleString('ar-YE')} ريال، وموعد السداد ${dueDate}. شاكرين لكم ثقتكم، ونسعد بخدمتكم دائماً.`
