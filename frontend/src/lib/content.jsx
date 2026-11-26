import { createContext, useContext } from 'react';
import { useFetch } from './useFetch.js';

const ContentContext = createContext({ content: {}, categories: [] });

export function ContentProvider({ children }) {
  const { data: content } = useFetch('/api/content');
  const { data: cats } = useFetch('/api/categories');
  return (
    <ContentContext.Provider value={{ content: content || {}, categories: cats ? cats.items : [] }}>
      {children}
    </ContentContext.Provider>
  );
}

export const useSite = () => useContext(ContentContext);
