import type { ShopType } from '../types/ledger.types'

export const shopTypes: Array<{ id: ShopType; label: string; icon: string; categories: string[]; suggestions: string[] }> = [
  { id: 'grocery', label: 'بقالة', icon: '🛒', categories: ['مواد غذائية', 'مشروبات', 'منظفات'], suggestions: ['رز', 'سكر', 'زيت', 'حليب', 'دقيق'] },
  { id: 'pharmacy', label: 'صيدلية', icon: '💊', categories: ['أدوية', 'فيتامينات', 'عناية'], suggestions: ['بنادول', 'مضاد حيوي', 'شراب كحة', 'فيتامينات', 'دواء ضغط وسكر'] },
  { id: 'hospital', label: 'مستشفى', icon: '🏥', categories: ['أدوية', 'مستلزمات طبية', 'خدمات'], suggestions: ['شاش طبي', 'قفازات طبية', 'كمامة', 'تحليل'] },
  { id: 'cafeteria', label: 'كافتيريا', icon: '☕', categories: ['مشروبات', 'وجبات', 'حلويات'], suggestions: ['شاي', 'قهوة', 'ماء', 'ساندويتش'] },
  { id: 'clothing', label: 'محل ملابس', icon: '👕', categories: ['ملابس', 'أحذية', 'إكسسوارات'], suggestions: ['ثوب', 'قميص', 'بنطلون', 'حذاء', 'عباية'] },
  { id: 'mobile', label: 'محل جوالات', icon: '📱', categories: ['إكسسوارات', 'أجهزة', 'صيانة'], suggestions: ['شاحن', 'سماعة', 'بطارية', 'كفر'] },
  { id: 'building', label: 'مواد بناء', icon: '🧱', categories: ['مواد بناء', 'أدوات', 'دهانات'], suggestions: ['اسمنت', 'حديد', 'بوية', 'سيراميك'] },
  { id: 'produce', label: 'خضار وفواكه', icon: '🍎', categories: ['خضار', 'فواكه'], suggestions: ['طماطم', 'بطاط', 'موز', 'تفاح'] },
  { id: 'other', label: 'محل آخر', icon: '🏪', categories: ['عام'], suggestions: [] },
]

export const shopTypeLabel = (type: ShopType, customType?: string) =>
  type === 'other' && customType ? customType : shopTypes.find(item => item.id === type)?.label ?? 'محل'
