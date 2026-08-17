import { useState } from "react"
import { Box, Stack, Typography } from "@mui/material"
import { ProjectMemberAvatar } from "@/react/members"
import {Permission, NoPermission, PermissionCodes, PermissionProps } from "@/fx/ui"
import { Comment } from "../comment-types"
import TextCommentForm from "./forms/TextCommentForm"

export interface TextCommentProps { comment: Comment}

export const TextComment = ({comment}: TextCommentProps) => {

  const [showForm, setShowForm] = useState<boolean>(false)


  const permissionProps: PermissionProps = {
    code: PermissionCodes.COMMENT_OWNER,
    comment,
    member: comment.owner
  }

  return (
    <>
      {showForm && (<TextCommentForm comment={comment} closeForm={() => setShowForm(false)}/> )}
      { !showForm && (
        <>
          <Permission {...permissionProps}>
            <Stack spacing={3} direction={'row'} sx={{ width: '100%'}}>
              <Box>
                <ProjectMemberAvatar type={PermissionCodes.PROJECT_MEMBER} member={comment.owner} />
              </Box>
              <Typography onClick={() => setShowForm(true)}>{comment.content}</Typography>
            </ Stack>
          </Permission>
          <NoPermission {...permissionProps} >
            <Stack spacing={3} direction={'row'} sx={{ width: '100%'}}>
              <Box>
                <ProjectMemberAvatar type={PermissionCodes.PROJECT_MEMBER} member={comment.owner} />
              </Box>
              <Typography >{comment.content}</Typography>
            </ Stack>
          </NoPermission>
        </>
      )}
    </>
  )
}

export default TextComment

// QA Brian Francis 10-27-23

