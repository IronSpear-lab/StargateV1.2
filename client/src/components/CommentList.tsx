import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  text: string;
  timestamp: string;
}

export function CommentList() {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "comment-1",
      userId: "user-1",
      userName: "John Doe",
      userInitials: "JD",
      userColor: "bg-primary-100 text-primary-600",
      text: "We need to clarify the access control requirements on page 5.",
      timestamp: "2 days ago"
    },
    {
      id: "comment-2",
      userId: "user-2",
      userName: "Alex Smith",
      userInitials: "AS",
      userColor: "bg-warning-100 text-warning-600",
      text: "Added a note about the technical requirements section. Let's discuss tomorrow.",
      timestamp: "Yesterday"
    }
  ]);
  
  const [newComment, setNewComment] = useState("");
  
  const handleCommentSubmit = () => {
    if (!newComment.trim() || !user) return;
    
    const comment: Comment = {
      id: `comment-${Date.now()}`,
      userId: user.id.toString(),
      userName: user.username,
      userInitials: user.username.split(" ").map(n => n[0]).join("").toUpperCase(),
      userColor: "bg-success-100 text-success-600",
      text: newComment,
      timestamp: "Just now"
    };
    
    setComments([...comments, comment]);
    setNewComment("");
  };
  
  return (
    <div className="border-t border-neutral-200 p-4">
      <h4 className="text-sm font-medium mb-3">Comments ({comments.length})</h4>
      
      <div className="space-y-4 mb-4">
        {comments.map(comment => (
          <div key={comment.id} className="flex items-start gap-3">
            <Avatar className={`h-8 w-8 ${comment.userColor}`}>
              <AvatarFallback className="text-sm font-medium">{comment.userInitials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center">
                <p className="text-sm font-medium">{comment.userName}</p>
                <p className="text-xs text-neutral-500 ml-2">{comment.timestamp}</p>
              </div>
              <p className="text-sm text-neutral-700">{comment.text}</p>
              <div className="flex items-center gap-2 mt-1">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-neutral-500 hover:text-neutral-700">Reply</Button>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-neutral-500 hover:text-neutral-700">Edit</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 bg-success-100 text-success-600">
          <AvatarFallback className="text-sm font-medium">
            {user ? user.username.substring(0, 2).toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea 
            placeholder="Add a comment..." 
            className="w-full text-sm min-h-[80px]"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <Button 
              size="sm"
              onClick={handleCommentSubmit}
              disabled={!newComment.trim()}
            >
              Comment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
