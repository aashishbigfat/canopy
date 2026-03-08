"""
Comment API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException

from app.models.user import User
from app.schemas.comment import (
    CommentCreate, CommentUpdate, CommentResponse, CommentListResponse
)
from app.services.comment_service import CommentService
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/{entity_type}/{entity_id}", response_model=CommentResponse, status_code=201)
async def create_comment(
    entity_type: str, entity_id: str, data: CommentCreate,
    current_user: User = Depends(get_current_user)
):
    """Add comment to entity"""
    service = CommentService()
    comment = await service.create_comment(
        entity_type, entity_id, data,
        current_user.id, current_user.name, current_user.tenant_id
    )
    return CommentResponse(
        id=str(comment.id),
        entity_type=comment.entity_type,
        entity_id=str(comment.entity_id),
        content=comment.content,
        author_id=str(comment.author_id),
        author_name=comment.author_name,
        parent_id=str(comment.parent_id) if comment.parent_id else None,
        is_edited=getattr(comment, 'is_edited', False),
        edited_at=getattr(comment, 'edited_at', None),
        mentioned_user_ids=[str(uid) for uid in comment.mentioned_user_ids],
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[]
    )


@router.get("/{entity_type}/{entity_id}", response_model=CommentListResponse)
async def get_entity_comments(
    entity_type: str, entity_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get comments for an entity"""
    service = CommentService()
    results = await service.get_comments_with_replies(entity_type, entity_id, current_user.tenant_id)
    
    comments = []
    for r in results:
        comment_data = CommentResponse(
            id=str(r["comment"].id),
            entity_type=r["comment"].entity_type,
            entity_id=str(r["comment"].entity_id),
            content=r["comment"].content,
            author_id=str(r["comment"].author_id),
            author_name=r["comment"].author_name,
            parent_id=str(r["comment"].parent_id) if r["comment"].parent_id else None,
            is_edited=getattr(r["comment"], 'is_edited', False),
            edited_at=getattr(r["comment"], 'edited_at', None),
            mentioned_user_ids=[str(uid) for uid in r["comment"].mentioned_user_ids],
            created_at=r["comment"].created_at,
            updated_at=r["comment"].updated_at
        )
        comment_data.replies = [CommentResponse(
            id=str(reply.id),
            entity_type=reply.entity_type,
            entity_id=str(reply.entity_id),
            content=reply.content,
            author_id=str(reply.author_id),
            author_name=reply.author_name,
            parent_id=str(reply.parent_id) if reply.parent_id else None,
            is_edited=getattr(reply, 'is_edited', False),
            edited_at=getattr(reply, 'edited_at', None),
            mentioned_user_ids=[str(uid) for uid in reply.mentioned_user_ids],
            created_at=reply.created_at,
            updated_at=reply.updated_at
        ) for reply in r["replies"]]
        comments.append(comment_data)
    
    return CommentListResponse(comments=comments, total=len(comments))


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: str, data: CommentUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a comment"""
    service = CommentService()
    comment = await service.update_comment(comment_id, data, current_user.id, current_user.tenant_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
    return CommentResponse(
        id=str(comment.id),
        entity_type=comment.entity_type,
        entity_id=str(comment.entity_id),
        content=comment.content,
        author_id=str(comment.author_id),
        author_name=comment.author_name,
        parent_id=str(comment.parent_id) if comment.parent_id else None,
        is_edited=getattr(comment, 'is_edited', False),
        edited_at=getattr(comment, 'edited_at', None),
        mentioned_user_ids=[str(uid) for uid in comment.mentioned_user_ids],
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        replies=[]
    )


@router.get("/{comment_id}/replies")
async def get_comment_replies(comment_id: str, current_user: User = Depends(get_current_user)):
    """Get replies to a comment"""
    service = CommentService()
    replies = await service.get_comment_replies(comment_id, current_user.tenant_id)
    return {"replies": [CommentResponse(
        id=str(r.id),
        entity_type=r.entity_type,
        entity_id=str(r.entity_id),
        content=r.content,
        author_id=str(r.author_id),
        author_name=r.author_name,
        parent_id=str(r.parent_id) if r.parent_id else None,
        is_edited=getattr(r, 'is_edited', False),
        edited_at=getattr(r, 'edited_at', None),
        mentioned_user_ids=[str(uid) for uid in r.mentioned_user_ids],
        created_at=r.created_at,
        updated_at=r.updated_at
    ) for r in replies], "total": len(replies)}


@router.delete("/{comment_id}")
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    """Delete a comment"""
    service = CommentService()
    success = await service.delete_comment(comment_id, current_user.id, current_user.tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found or not authorized")
    return {"error": False, "message": "Comment deleted"}
