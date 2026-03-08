"""
Note API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from bson import ObjectId

from app.models.user import User
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse, NoteListResponse
from app.services.note_service import NoteService
from app.api.deps import get_current_user, check_permission

router = APIRouter()

@router.post("/", response_model=NoteResponse, status_code=201)
async def create_note(
    note_data: NoteCreate,
    current_user: User = Depends(check_permission("create_note"))
):
    """Create a new note"""
    service = NoteService()
    note = await service.create_note(
        note_data,
        current_user.id,
        current_user.tenant_id
    )
    
    return NoteResponse.from_orm(note)


@router.get("/my-notes", response_model=NoteListResponse)
async def get_my_notes(
    current_user: User = Depends(get_current_user)
):
    """Get all notes created by current user"""
    service = NoteService()
    notes = await service.get_notes_by_user(
        current_user.tenant_id,
        current_user.id
    )
    
    return NoteListResponse(
        notes=[NoteResponse.from_orm(n) for n in notes],
        total=len(notes)
    )


@router.get("/entity/{noteable_type}/{noteable_id}", response_model=NoteListResponse)
async def get_notes_by_entity(
    noteable_type: str,
    noteable_id: str,
    current_user: User = Depends(check_permission("view_note"))
):
    """Get all notes for a specific entity"""
    service = NoteService()
    notes = await service.get_notes_by_entity(
        noteable_type,
        noteable_id,
        current_user.tenant_id,
        current_user.id
    )
    
    return NoteListResponse(
        notes=[NoteResponse.from_orm(n) for n in notes],
        total=len(notes)
    )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    current_user: User = Depends(check_permission("view_note"))
):
    """Get note by ID"""
    service = NoteService()
    note = await service.get_note(
        note_id,
        current_user.tenant_id,
        current_user.id
    )
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return NoteResponse.from_orm(note)


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    note_data: NoteUpdate,
    current_user: User = Depends(check_permission("edit_note"))
):
    """Update a note"""
    service = NoteService()
    note = await service.update_note(
        note_id,
        note_data,
        current_user.id,
        current_user.tenant_id
    )
    
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or access denied")
    
    return NoteResponse.from_orm(note)


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    current_user: User = Depends(check_permission("delete_note"))
):
    """Delete a note (soft delete)"""
    service = NoteService()
    success = await service.delete_note(
        note_id,
        current_user.tenant_id,
        current_user.id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Note not found or access denied")
    
    return {
        "error": False,
        "message": "Note deleted successfully"
    }
