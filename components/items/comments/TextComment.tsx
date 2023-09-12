import { useContext, useState } from "react";
import { Box, IconButton, Stack, TextField, Typography } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';

import { Comment } from "@/interfaces/CommentInterface";
import { ProjectMemberAvatar } from "@/components/members/projects/ProjectMemberAvatar";
import Permission, { NoPermission, PermissionCodes } from "@/ui/PermissionComponent";
import { FormikProvider, useFormik, Form } from "formik";


import * as Yup from "yup"
import axios from "axios";
import { ProjectContext } from "@/interfaces/ProjectInterface";
import { ItemContext } from "@/interfaces/ItemInterface";
import { useSnackbar } from "notistack";

export interface TextCommentProps {
  comment: Comment;
}

const editCommentSchema = Yup.object().shape({
  comment: Yup.string().required('Comment Content is required.'),
})

export const TextComment = (props: TextCommentProps) => {
  const {comment} = props;

  const {project} = useContext(ProjectContext)
  const {item, setItem} = useContext(ItemContext)

  const {enqueueSnackbar} = useSnackbar()

  const [displayEditTextCommentForm, setDisplayEditTextCommentForm] = useState<boolean>(false)

  const handleDeleteComment = () => {

    axios.delete(`/api/members/projects/${project?.id}/items/${item?.id}/comments/${comment.id}`)
      .then((res) => {
        setItem(res.data.item)
        enqueueSnackbar("Comment Deleted", {variant: "success"})
      })
      .catch((e) => {
        enqueueSnackbar(e.response.data.message, {variant: "error"})
      })
  }

  const formik = useFormik({
    initialValues: { comment: comment.content },
    validationSchema: editCommentSchema,
    onSubmit: (data) => {
      axios.patch(`/api/members/projects/${project?.id}/items/${item?.id}/comments/${comment.id}`,
        {content: data.comment, sectiontype: "63b2503c49220f42d9fc17d9"})
        .then((res) => {
          formik.setSubmitting(false)
          if (res.status === axios.HttpStatusCode.Ok ){
            formik.resetForm({values: {comment: data.comment}})
            setItem(res.data.item)
            enqueueSnackbar("Item Comment Updated", {variant: "success"})
            setDisplayEditTextCommentForm(false);
          }
        })
        .catch((e) => {
          formik.setSubmitting(false)
          enqueueSnackbar(e.response.data.message, {variant: "error"})
        })
    }
  })

  const {errors, touched, handleSubmit, getFieldProps, isSubmitting, isValid} = formik

  return (
    <>
      {displayEditTextCommentForm && (
        <>
          <Stack spacing={3} direction={'row'} sx={{ width: '100%'}}>
            <Box>
              <ProjectMemberAvatar type={PermissionCodes.PROJECT_MEMBER} member={comment.owner} />
            </Box>
            <Box sx={{ width: '100%', pt: 1, }}>
              <FormikProvider value={formik}>
                <Form autoComplete="off" noValidate onSubmit={handleSubmit}>
                  <TextField multiline rows={4}
                    sx={{ width: '100%'}} label="Update Comment"
                    {...getFieldProps('comment')} error={Boolean(touched && errors.comment)}
                    helperText={touched && errors.comment} />
                  <Box sx={{display: 'flex', justifyContent: 'flex-end'}}>
                    <IconButton color="success" type="submit" disabled={!(isValid && formik.dirty)}>
                      <CheckIcon />
                    </IconButton>
                    <IconButton onClick={() => setDisplayEditTextCommentForm(false)}>
                      <CancelIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteComment()}>
                      <DeleteIcon color={'error'}/>
                    </IconButton>
                  </Box>
                </Form>
              </FormikProvider>
            </Box>
          </Stack>
        </>
      )}

      { !displayEditTextCommentForm && (
        <>
          <Permission code={PermissionCodes.COMMENT_OWNER} comment={comment} member={comment.owner}>

            <Stack spacing={3} direction={'row'} sx={{ width: '100%'}}>
              <Box>
                <ProjectMemberAvatar type={PermissionCodes.PROJECT_MEMBER} member={comment.owner} />
              </Box>
              <Typography onClick={() => setDisplayEditTextCommentForm(true)}>
                {comment.content}
              </Typography>
            </ Stack>
          </Permission>
          <NoPermission
            code={PermissionCodes.COMMENT_OWNER} comment={comment} member={comment.owner}>
            <Stack spacing={3} direction={'row'} sx={{ width: '100%'}}>

              <Box>
                <ProjectMemberAvatar type={PermissionCodes.PROJECT_MEMBER} member={comment.owner} />
              </Box>
              <Typography >  {comment.content} </Typography>
            </ Stack>
          </NoPermission>

        </>
      )}
    </>
  )
}
