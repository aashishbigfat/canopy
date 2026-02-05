"""
Note service layer - Business logic for note management
"""
from typing import List, Optional
from bson import ObjectId
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate

class NoteService:
    """Service for Note business logic"""
    
    async def create_note(
        self,
        note_data: NoteCreate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Note:
        """Create a new note"""
        
        note = Note(
            **note_data.model_dump(exclude_unset=True),
            tenant_id=tenant_id,
            owner_id=user_id,
            created_by=user_id
        )
        
        await note.insert()
        return note
    
    async def get_note(
        self,
        note_id: str,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> Optional[Note]:
        """Get note by ID (respecting privacy)"""
        note = await Note.get(ObjectId(note_id))
        
        if not note or note.tenant_id != tenant_id or note.deleted_at:
            return None
        
        # Check privacy
        if note.is_private and note.owner_id != user_id:
            return None
        
        return note
    
    async def update_note(
        self,
        note_id: str,
        note_data: NoteUpdate,
        user_id: ObjectId,
        tenant_id: ObjectId
    ) -> Optional[Note]:
        """Update a note"""
        note = await self.get_note(note_id, tenant_id, user_id)
        
        if not note:
            return None
        
        # Only owner can update
        if note.owner_id != user_id:
            return None
        
        # Update fields
        update_data = note_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(note, field, value)
        
        note.last_modified_by_id = user_id
        await note.save()
        
        return note
    
    async def delete_note(
        self,
        note_id: str,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> bool:
        """Soft delete a note"""
        note = await self.get_note(note_id, tenant_id, user_id)
        
        if not note:
            return False
        
        # Only owner can delete
        if note.owner_id != user_id:
            return False
        
        await note.soft_delete()
        return True
    
    async def get_notes_by_entity(
        self,
        noteable_type: str,
        noteable_id: str,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> List[Note]:
        """Get all notes for a specific entity (respecting privacy)"""
        all_notes = await Note.find(
            Note.noteable_type == noteable_type,
            Note.noteable_id == ObjectId(noteable_id),
            Note.tenant_id == tenant_id,
            Note.deleted_at == None
        ).sort("-created_at").to_list()
        
        # Filter private notes
        visible_notes = [
            note for note in all_notes
            if not note.is_private or note.owner_id == user_id
        ]
        
        return visible_notes
    
    async def get_notes_by_user(
        self,
        tenant_id: ObjectId,
        user_id: ObjectId
    ) -> List[Note]:
        """Get all notes created by user"""
        notes = await Note.find(
            Note.tenant_id == tenant_id,
            Note.owner_id == user_id,
            Note.deleted_at == None
        ).sort("-created_at").to_list()
        
        return notes
