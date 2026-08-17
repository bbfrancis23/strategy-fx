import { useContext, useState } from 'react'
import { Box, IconButton, TextField, Typography, BoxProps, TextFieldProps } from "@mui/material"
import { alpha } from '@mui/material/styles'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import { Form, FormikProvider, useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { useSnackbar } from 'notistack'
import {Column} from '@/react/column'
import { ProjectContext } from '@/react/project/'
import { MemberContext } from '@/react/members'
import { BoardContext } from '@/react/board/BoardContext'
import {Permission, PermissionCodes, NoPermission,
  SaveButton, SaveButtonProps, FormActions } from '@/fx/ui'
import { FxThemeContext } from '@/fx/theme'

interface ColumnFormProps { column: Column}
const colTitleSchema = Yup.object().shape({ title: Yup.string().required('Title is required')})

export const ColumnForm = ({column}: ColumnFormProps) => {

  const [showForm, setShowForm] = useState<boolean>(false)
  const {member} = useContext(MemberContext)
  const {fxTheme: fx} = useContext(FxThemeContext)
  const {project} = useContext(ProjectContext)
  const {board, setBoard} = useContext(BoardContext)
  const {enqueueSnackbar} = useSnackbar()

  const formik = useFormik({
    initialValues: { title: column.title },
    validationSchema: colTitleSchema,
    onSubmit: (data) => {
      const colPath = `/api/members/projects/${project.id}/boards/${board.id}/columns/${column.id}`
      axios.patch( colPath, {title: data.title}, )
        .then((res) => {
          formik.setSubmitting(false)
          if (res.status === axios.HttpStatusCode.Ok ){
            formik.resetForm()
            setBoard(res.data.board)
            enqueueSnackbar("Column updated", {variant: "success"})
            setShowForm(false)
          }
        }).catch((error) => {
          formik.setSubmitting(false)
          enqueueSnackbar(error.message, {variant: "error"})
        })
    }
  })

  const closeForm = () => { formik.resetForm(); setShowForm(false) }

  const {errors, touched, handleSubmit, getFieldProps} = formik

  const colBox: BoxProps = {
    sx: {
      bgcolor: alpha(fx.theme.palette.background.default, 0.4),
      p: 1, borderRadius: 3, width: 272
    }
  }

  const titleField: TextFieldProps = {
    label: 'Column',
    size: 'small',
    error: Boolean(touched && errors.title),
    helperText: touched && errors.title,
    fullWidth: true,
    ...getFieldProps('title'),
    autoFocus: true
  }

  const ColumnForm = (
    <Box sx={{ width: '272px', ml : -1}}>
      <Box {...colBox}>
        <FormikProvider value={formik}>
          <Form autoComplete="off" noValidate onSubmit={handleSubmit}>
            <Box sx={{ ml: 1, display: 'block'}}>
              <Box sx={{ display: 'flex'}}><TextField {...titleField} /></Box>
              <Box sx={{display: 'flex', justifyContent: "right" }}>
                <FormActions onCancel={closeForm} title="Column" />
              </Box>
            </ Box>
          </Form>
        </FormikProvider>
      </Box>
    </Box>
  )

  return (showForm ? ColumnForm :
    <>
      <Permission code={PermissionCodes.PROJECT_ADMIN} project={project} member={member}>
        <Typography sx={{p: 2}} onClick={() => setShowForm(true)} >{column.title}</Typography>
      </Permission>
      <NoPermission code={PermissionCodes.PROJECT_ADMIN} project={project} member={member}>
        <Typography sx={{p: 2}} >{column.title}</Typography>
      </NoPermission>
    </>
  )
}

export default ColumnForm

// QA Brian Francis 10/26/23