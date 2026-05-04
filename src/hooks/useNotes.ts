import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { BroadcastNote } from '../services/socketService';

export const useNotes = () => {
  const { notes, isConnected, onNoteReceived, onNoteDeleted } = useSocket();
  const [activeNotes, setActiveNotes] = useState<BroadcastNote[]>([]);
  const [dismissedNoteIds, setDismissedNoteIds] = useState<Set<string>>(new Set());

  // Filter active notes (not expired, not dismissed)
  useEffect(() => {
    const now = new Date();
    const active = notes.filter(note => {
      // Check if dismissed
      if (dismissedNoteIds.has(note.noteId)) {
        return false;
      }
      
      // Check if expired
      if (note.expiresAt) {
        const expiresAt = new Date(note.expiresAt);
        if (now > expiresAt) {
          return false;
        }
      }
      
      return true;
    });
    
    // Sort by priority (urgent > high > normal > low) and then by creation date
    active.sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        urgent: 4,
        high: 3,
        normal: 2,
        low: 1,
      };
      
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    setActiveNotes(active);
  }, [notes, dismissedNoteIds]);

  // Dismiss a note
  const dismissNote = useCallback((noteId: string) => {
    setDismissedNoteIds(prev => new Set([...prev, noteId]));
  }, []);

  // Get note by ID
  const getNoteById = useCallback((noteId: string): BroadcastNote | undefined => {
    return notes.find(note => note.noteId === noteId);
  }, [notes]);

  // Get notes by type
  const getNotesByType = useCallback((type: BroadcastNote['type']): BroadcastNote[] => {
    return activeNotes.filter(note => note.type === type);
  }, [activeNotes]);

  // Get notes by priority
  const getNotesByPriority = useCallback((priority: BroadcastNote['priority']): BroadcastNote[] => {
    return activeNotes.filter(note => note.priority === priority);
  }, [activeNotes]);

  // Check if note is urgent
  const isUrgent = useCallback((note: BroadcastNote): boolean => {
    return note.priority === 'urgent' || 
           (note.type === 'maintenance' && note.priority === 'high');
  }, []);

  return {
    notes: activeNotes,
    allNotes: notes,
    isConnected,
    dismissNote,
    getNoteById,
    getNotesByType,
    getNotesByPriority,
    isUrgent,
    onNoteReceived,
    onNoteDeleted,
  };
};

