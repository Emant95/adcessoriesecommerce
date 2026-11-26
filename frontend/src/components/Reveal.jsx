import { motion } from 'framer-motion';

// Fade + slide-up when a section scrolls into view.
export default function Reveal({ children, delay = 0, className = '', as = 'div' }) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </M>
  );
}
