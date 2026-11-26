import { useSite } from '../../lib/content.jsx';
import { useSeo } from '../../lib/seo.js';
import Reveal from '../../components/Reveal.jsx';

export default function About() {
  const { content } = useSite();
  const about = content.about || {};
  useSeo({ title: `About | ${content.store?.name || 'Adcessories'}`, description: about.body });
  return (
    <div className="container-x grid items-center gap-12 py-14 md:grid-cols-2">
      <Reveal>
        <p className="eyebrow">About us</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">{about.title || 'Our story'}</h1>
        <div className="mt-6 space-y-4 whitespace-pre-line leading-relaxed text-taupe">{about.body}</div>
      </Reveal>
      {about.imageUrl && (
        <Reveal delay={0.1}>
          <img src={about.imageUrl} alt="" className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-lift" />
        </Reveal>
      )}
    </div>
  );
}
