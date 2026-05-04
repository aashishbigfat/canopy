"""
Comment service layer
"""
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentUpdate


class CommentService:
    """Service for Comment business logic"""
    
    async def create_comment(
        self, entity_type: str, entity_id: str, data: CommentCreate,
        author_id: ObjectId, author_name: str, tenant_id: ObjectId
    ) -> Comment:
        comment = Comment(
            entity_type=entity_type,
            entity_id=ObjectId(entity_id),
            content=data.content,
            author_id=author_id,
            author_name=author_name,
            tenant_id=tenant_id
        )
        if data.parent_id:
            comment.parent_id = ObjectId(data.parent_id)
        if data.mentioned_user_ids:
            comment.mentioned_user_ids = [ObjectId(uid) for uid in data.mentioned_user_ids]
        
        await comment.insert()
        return comment
    
    async def get_comment(self, comment_id: str, tenant_id: ObjectId) -> Optional[Comment]:
        comment = await Comment.get(ObjectId(comment_id))
        return comment if comment and comment.tenant_id == tenant_id and not comment.deleted_at else None
    
    async def update_comment(
        self, comment_id: str, data: CommentUpdate, user_id: ObjectId, tenant_id: ObjectId
    ) -> Optional[Comment]:
        comment = await self.get_comment(comment_id, tenant_id)
        if not comment or comment.author_id != user_id:
            return None
        
        comment.content = data.content
        comment.is_edited = True
        comment.edited_at = datetime.utcnow()
        await comment.save()
        return comment
    
    async def delete_comment(self, comment_id: str, user_id: ObjectId, tenant_id: ObjectId) -> bool:
        comment = await self.get_comment(comment_id, tenant_id)
        if not comment or comment.author_id != user_id:
            return False
        
        # Delete replies too
        replies = await Comment.find(Comment.parent_id == comment.id).to_list()
        for reply in replies:
            await reply.soft_delete()
        
        await comment.soft_delete()
        return True
    
    async def get_entity_comments(
        self, entity_type: str, entity_id: str, tenant_id: ObjectId
    ) -> List[Comment]:
        # Get top-level comments
        comments = await Comment.find(
            {"entity_type": entity_type, "entity_id": ObjectId(entity_id), "tenant_id": tenant_id, "parent_id": None, "deleted_at": None}
        ).sort("-created_at").to_list()
        
        return comments
    
    async def get_comment_replies(self, parent_id: str, tenant_id: ObjectId) -> List[Comment]:
        return await Comment.find(
            {"parent_id": ObjectId(parent_id), "tenant_id": tenant_id, "deleted_at": None}
        ).sort("+created_at").to_list()
    
    async def get_comments_with_replies(
        self, entity_type: str, entity_id: str, tenant_id: ObjectId
    ) -> List[dict]:
        """Get comments with nested replies"""
        comments = await self.get_entity_comments(entity_type, entity_id, tenant_id)
        result = []
        
        for comment in comments:
            replies = await self.get_comment_replies(str(comment.id), tenant_id)
            result.append({"comment": comment, "replies": replies})
        
        return result
