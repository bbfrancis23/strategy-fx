import { useState } from "react"
import { Box, Stack } from "@mui/material"
import { useSnackbar } from "notistack"

import { Comment } from "@/react/comments"
import { ProjectMemberAvatar } from "@/react/members"
import {Permission, NoPermission, PermissionCodes, PermissionProps} from "@/fx/ui"
import { FxCodeEditor } from "@/fx/ui"
import CodeCommentForm from "./forms/CodeCommentForm"
import { TextareaCodeEditorProps } from "@uiw/react-textarea-code-editor"

export interface CodeCommentProps { comment: Comment}

export const CodeComment = ({comment}: CodeCommentProps) => {

  const {enqueueSnackbar} = useSnackbar()
  const [showForm, setShowForm] = useState<boolean>(false)

  const Avatar = () => (
    <Box><ProjectMemberAvatar type={PermissionCodes.PROJECT_MEMBER} member={comment.owner} /></Box>
  )

  const permissionProps: PermissionProps = {
    code: PermissionCodes.COMMENT_OWNER,
    comment,
    member: comment.owner
  }

  const codeEditorProps: TextareaCodeEditorProps = {
    value: comment.content,
    readOnly: true
  }

  return (
    <>
      { showForm && ( <CodeCommentForm comment={comment} closeForm={() => setShowForm(false)}/> ) }
      { !showForm && (
        <>
          <Stack spacing={3} direction={'row'} sx={{ width: '100%'}}>
            <Avatar />
            <Permission {...permissionProps}>
              <FxCodeEditor onClick={() => setShowForm(true)} {...codeEditorProps}/>
            </Permission>
            <NoPermission {...permissionProps}><FxCodeEditor {...codeEditorProps}/></NoPermission>
          </Stack>
        </>
      ) }
    </>
  )
}

export default CodeComment

// QA Brian Francis 10/27/2023