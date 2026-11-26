import { useMemo, useState } from 'react'
import { Archive, Boxes, ChevronDown, Plus, Search, Tag } from 'lucide-react'
import type { Product, ProductDraft } from '../../types/ledger.types'
import { money } from '../shared'
import { ProductModal } from './ProductModal'

export const ProductsView = ({ products, categories, suggestions, onSave }: {
  products: Product[]
  categories: string[]
  suggestions: string[]
  onSave: (product: ProductDraft) => void
}) => {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('الكل')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Product | null | undefined>(undefined)
  const [suggestionName, setSuggestionName] = useState('')
  const filtered = useMemo(() => products.filter(product =>
    (showInactive || product.active) && (category === 'الكل' || product.category === category) && product.name.toLowerCase().includes(search.trim().toLowerCase())
  ), [products, category, search, showInactive])
  const filters = ['الكل', ...new Set(products.map(product => product.category))]
  const categoryOptions = [...new Set([...categories, ...products.map(product => product.category)])]
  return <section className="content-card">
    <div className="section-heading inside"><div><h2>المنتجات والأسعار</h2><p>أسعارك أنت، وسعر كل عملية محفوظ كما سُجل</p></div><button className="button button-primary" onClick={() => { setSuggestionName(''); setEditing(null) }}><Plus size={17} /> إضافة منتج</button></div>
    {suggestions.filter(name => !products.some(product => product.name === name)).length > 0 && <div className="suggestion-strip"><div><strong>اقتراحات تناسب نوع محلك</strong><small>اختر منتجاً وحدد سعره بنفسك لبدء استخدامه</small></div><div className="suggestion-chips">{suggestions.filter(name => !products.some(product => product.name === name)).map(name => <button key={name} onClick={() => { setSuggestionName(name); setEditing(null) }}><Plus size={14} /> {name}</button>)}</div></div>}
    <div className="product-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث عن منتج..." /></label><label className="select-field"><Tag size={17} /><select value={category} onChange={event => setCategory(event.target.value)}>{filters.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={15} /></label><button className={`filter-toggle ${showInactive ? 'selected' : ''}`} onClick={() => setShowInactive(value => !value)}><Archive size={16} /> {showInactive ? 'إخفاء غير النشط' : 'عرض غير النشط'}</button></div>
    <div className="product-grid">{filtered.map(product => <article className={`product-card ${!product.active ? 'inactive' : ''}`} key={product.id}><div className="product-card-top"><span className="product-mark"><Boxes size={20} /></span><button className={`tiny-status ${product.active ? 'active' : ''}`} onClick={() => onSave({ ...product, active: !product.active })}>{product.active ? 'نشط' : 'متوقف'}</button></div><small>{product.category}</small><h3>{product.name}</h3><div className="product-price">{money(product.price)} <span>/ {product.unit}</span></div>{product.stock !== undefined && <p className="stock-label">المتوفر: {product.stock.toLocaleString('ar-YE')} {product.unit}</p>}<button className="edit-price" onClick={() => setEditing(product)}>تعديل المنتج والسعر <ChevronDown size={15} /></button></article>)}
      {!filtered.length && <div className="empty-state product-empty"><span>📦</span><strong>لا توجد منتجات مطابقة</strong><p>أضف منتجاً جديداً أو غيّر كلمات البحث.</p>{!products.length && <button className="button button-primary" onClick={() => setEditing(null)}>إضافة أول منتج</button>}</div>}
    </div>
    {editing !== undefined && <ProductModal product={editing ?? undefined} initialName={suggestionName} categories={categoryOptions.length ? categoryOptions : ['عام']} onSave={onSave} onClose={() => setEditing(undefined)} />}
  </section>
}
