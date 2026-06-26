import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, QueryConstraint, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export function usePaginatedCollection<T>(
  collectionName: string,
  queryConstraints: QueryConstraint[],
  pageSize: number = 10
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, collectionName), ...queryConstraints, limit(pageSize));
      const snapshot = await getDocs(q);
      
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        const item = { ...data, id: doc.id };
        // Convert any Firestore Timestamps to ISO strings
        Object.keys(item).forEach(key => {
          if (item[key] && typeof item[key].toDate === 'function') {
            item[key] = item[key].toDate().toISOString();
          }
        });
        return item as T;
      });
      
      setData(items);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err: any) {
      setError(err);
      console.error(`Error fetching paginated ${collectionName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, JSON.stringify(queryConstraints), pageSize]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const loadMore = async () => {
    if (!db || !hasMore || loadingMore || !lastDoc) return;
    
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, collectionName),
        ...queryConstraints,
        startAfter(lastDoc),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      
      const newItems = snapshot.docs.map(doc => {
        const data = doc.data();
        const item = { ...data, id: doc.id };
        Object.keys(item).forEach(key => {
          if (item[key] && typeof item[key].toDate === 'function') {
            item[key] = item[key].toDate().toISOString();
          }
        });
        return item as T;
      });
      
      setData(prev => [...prev, ...newItems]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err: any) {
      setError(err);
      console.error(`Error loading more ${collectionName}:`, err);
    } finally {
      setLoadingMore(false);
    }
  };

  return { data, loading, loadingMore, hasMore, loadMore, error, refetch: fetchInitial };
}
