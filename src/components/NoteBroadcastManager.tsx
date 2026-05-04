import React, { useState, useEffect, useRef } from 'react';
import { useNotes } from '../hooks/useNotes';
import NoteBroadcastModal from './NoteBroadcastModal';
import { BroadcastNote } from '../services/socketService';

const NoteBroadcastManager: React.FC = () => {
  const { notes, dismissNote, onNoteReceived } = useNotes();
  const [currentNote, setCurrentNote] = useState<BroadcastNote | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shownNoteIds, setShownNoteIds] = useState<Set<string>>(new Set());
  const noteQueueRef = useRef<BroadcastNote[]>([]);
  const isShowingRef = useRef(false);

  // Handle new note received
  useEffect(() => {
    const handleNoteReceived = (note: BroadcastNote) => {
      // console.log('📢 NoteBroadcastManager: New note received:', note.noteId);
      
      // Add to queue if not already shown
      if (!shownNoteIds.has(note.noteId)) {
        noteQueueRef.current.push(note);
        processNoteQueue();
      }
    };

    onNoteReceived(handleNoteReceived);

    return () => {
      onNoteReceived(() => {});
    };
  }, [onNoteReceived, shownNoteIds]);

  // Process note queue
  const processNoteQueue = () => {
    if (isShowingRef.current || noteQueueRef.current.length === 0) {
      return;
    }

    const nextNote = noteQueueRef.current.shift();
    if (nextNote && !shownNoteIds.has(nextNote.noteId)) {
      isShowingRef.current = true;
      setCurrentNote(nextNote);
      setIsVisible(true);
      setShownNoteIds(prev => new Set([...prev, nextNote.noteId]));
    }
  };

  // Check for notes on mount and when notes change
  useEffect(() => {
    if (notes.length > 0 && !isShowingRef.current) {
      // Find first note that hasn't been shown
      const unshownNote = notes.find(note => !shownNoteIds.has(note.noteId));
      if (unshownNote) {
        noteQueueRef.current.push(unshownNote);
        processNoteQueue();
      }
    }
  }, [notes, shownNoteIds]);

  // Handle modal close
  const handleClose = () => {
    setIsVisible(false);
    isShowingRef.current = false;
    
    // Process next note in queue after a short delay
    setTimeout(() => {
      processNoteQueue();
    }, 300);
  };

  // Handle note dismiss
  const handleDismiss = (noteId: string) => {
    dismissNote(noteId);
    handleClose();
  };

  return (
    <NoteBroadcastModal
      note={currentNote}
      visible={isVisible}
      onClose={handleClose}
      onDismiss={handleDismiss}
    />
  );
};

export default NoteBroadcastManager;

