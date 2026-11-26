import { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Upload } from 'lucide-react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../lib/useFetch.js';
import { useToast } from '../../components/Toast.jsx';
import { PageSpinner, ErrorState } from '../../components/Skeleton.jsx';
import { PageHeader } from './AdminLayout.jsx';

// Field definitions per section; type: text | textarea | image | list
const SECTIONS = {
  store: { label: 'Store info', fields: [['name', 'Store name'], ['tagline', 'Tagline'], ['currency', 'Currency code'], ['announcement', 'Announcement bar text']] },
  hero: { label: 'Homepage hero', fields: [['headline', 'Headline'], ['subheadline', 'Supporting text', 'textarea'], ['ctaLabel', 'Button label'], ['ctaLink', 'Button link (e.g. /shop)'], ['imageUrl', 'Hero image', 'image']] },
  about: { label: 'About page', fields: [['title', 'Title'], ['body', 'Story', 'textarea'], ['imageUrl', 'Image', 'image']] },
  contact: { label: 'Contact', fields: [['email', 'Email'], ['phone', 'Phone'], ['whatsapp', 'WhatsApp number (with country code)'], ['address', 'Address'], ['hours', 'Opening hours'], ['mapUrl', 'Google Maps embed URL']] },
  social: { label: 'Social links', fields: [['instagram', 'Instagram URL'], ['facebook', 'Facebook URL'], ['tiktok', 'TikTok URL']] },
  policies: { label: 'Policies', fields: [['shipping', 'Shipping & delivery', 'textarea'], ['returns', 'Returns & exchanges', 'textarea'], ['privacy', 'Privacy policy', 'textarea'], ['terms', 'Terms of use', 'textarea']] },
  testimonials: { label: 'Testimonials', list: [['name', 'Name'], ['location', 'Location'], ['text', 'Quote', 'textarea']] },
  faq: { label: 'FAQ', list: [['q', 'Question'], ['a', 'Answer', 'textarea']] },
};

function ImageField({ value, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    setBusy(true);
    try {
      const r = await api.post('/api/admin/content/upload', fd);
      onChange(r.url);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-4">
      {value ? <img src={value} alt="" className="h-20 w-20 rounded-xl object-cover" /> : <div className="h-20 w-20 rounded-xl bg-cream" />}
      <label className="btn-outline cursor-pointer">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
        <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => upload(e.target.files[0])} />
      </label>
      {value && <button type="button" className="btn-ghost" onClick={() => onChange('')}>Remove</button>}
    </div>
  );
}

function Input({ type, value, onChange }) {
  if (type === 'textarea') return <textarea className="input min-h-[110px]" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  if (type === 'image') return <ImageField value={value} onChange={onChange} />;
  return <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}

export default function Content() {
  const { data, loading, error, reload } = useFetch('/api/admin/content');
  const toast = useToast();
  const [tab, setTab] = useState('store');
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setDraft(data.content);
  }, [data]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) return <PageSpinner />;

  const section = SECTIONS[tab];
  const value = draft[tab] || (section.list ? { items: [] } : {});
  const setValue = (v) => setDraft({ ...draft, [tab]: v });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.put(`/api/admin/content/${tab}`, value);
      setDraft({ ...draft, [tab]: r.value });
      toast(`${section.label} saved. It's live on the store now.`);
    } catch (err) {
      toast(err.details?.[0] ? `${err.details[0].field}: ${err.details[0].message}` : err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Site content" subtitle="Edit what shoppers see. Changes go live as soon as you save." />
      <div className="mb-6 flex flex-wrap gap-2">
        {Object.entries(SECTIONS).map(([k, s]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-sm transition-colors ${tab === k ? 'bg-espresso text-warm' : 'bg-cream hover:bg-line'}`}>{s.label}</button>
        ))}
      </div>
      <form onSubmit={save} className="card max-w-3xl space-y-5 p-6">
        {section.fields?.map(([k, label, type]) => (
          <div key={k}>
            <label className="label">{label}</label>
            <Input type={type} value={value[k]} onChange={(v) => setValue({ ...value, [k]: v })} />
          </div>
        ))}
        {section.list && (
          <div className="space-y-4">
            {(value.items || []).map((item, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-line bg-warm p-4">
                {section.list.map(([k, label, type]) => (
                  <div key={k}>
                    <label className="label">{label}</label>
                    <Input type={type} value={item[k]} onChange={(v) => setValue({ items: value.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })} />
                  </div>
                ))}
                <button type="button" className="btn-ghost !px-2 text-red-600" onClick={() => setValue({ items: value.items.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /> Remove</button>
              </div>
            ))}
            <button type="button" className="btn-outline" onClick={() => setValue({ items: [...(value.items || []), {}] })}><Plus className="h-4 w-4" /> Add item</button>
          </div>
        )}
        <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Save {section.label.toLowerCase()}</button>
      </form>
    </>
  );
}
