import { useContext, useState } from "react"
import { Box, BoxProps, Button, IconButton, TextField, TextFieldProps } from "@mui/material"
import { alpha } from '@mui/material/styles'
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import { useSnackbar } from "notistack"
import { Form, FormikProvider, useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { ProjectContext } from "@/react/project"
import { BoardContext } from "@/react/board"
import {ColumnStub} from "@/react/column"
import { FxThemeContext } from "@/fx/theme"
import { ClickAwaySave, FormActions, SaveButton } from "@/fx/ui"

const createColSchema = Yup.object().shape({ title: Yup.string().required('Title is required')})

export const CreateColumnForm = () => {

  const {project} = useContext(ProjectContext)
  const {fxTheme} = useContext(FxThemeContext)
  const {board, setBoard} = useContext(BoardContext)
  const {enqueueSnackbar} = useSnackbar()
  const [showForm, setShowForm] = useState<boolean>(false)

  const formik = useFormik({
    initialValues: { title: '' },
    validationSchema: createColSchema,
    onSubmit: (data) => {
      const createColPath = `/api/members/projects/${project.id}/boards/${board.id}/columns`
      axios.post(createColPath, {title: data.title}, )
        .then((res) => {
          formik.setSubmitting(false)
          if (res.status === axios.HttpStatusCode.Created ){
            setBoard(res.data.board)
            enqueueSnackbar("Column created", {variant: "success"})
            formik.resetForm()
            setShowForm(false)
          }
        })
        .catch((error) => {
          formik.setSubmitting(false)
          enqueueSnackbar(error.message, {variant: "error"})
        })
    }
  })

  const closeForm = () => { formik.resetForm(); setShowForm(false) }

  const {errors, touched, handleSubmit, getFieldProps, isSubmitting, isValid, dirty} = formik

  const colTitleTextField: TextFieldProps = {
    size: 'small',
    label: 'New Column',
    ...getFieldProps('title'),
    error: Boolean(touched && errors.title),
    helperText: touched && errors.title,
    fullWidth: true,
    autoFocus: true
  }

  const colBox: BoxProps = {
    sx: {
      bgcolor: alpha(fxTheme.theme.palette.background.default, 0.4),
      p: 1, borderRadius: 3, width: 272
    }
  }

  const ColumnForm = (
    <Box sx={{ width: '272px'}}>
      <Box {...colBox}>
        <FormikProvider value={formik}>
          <ClickAwaySave>
            <Form autoComplete="off" noValidate onSubmit={handleSubmit}>
              <Box sx={{ ml: 1, display: 'block'}}>
                <Box sx={{ display: 'flex'}}><TextField {...colTitleTextField}/></Box>
                <Box display={{ display: 'flex', justifyContent: "right" }}>
                  <FormActions onCancel={closeForm} title="Column" />
                </Box>
              </ Box>
            </Form>
          </ClickAwaySave>
        </FormikProvider>
      </Box>
    </Box>
  )

  return( showForm ? ColumnForm :
    <Box><Button aria-label="create-column" onClick={() => setShowForm(true)}
      sx={{ m: 0, p: 0,
        bgcolor: alpha(fxTheme.theme.palette.background.default, 0.4)}}>
      <ColumnStub /></Button></Box>
  )

}
export default CreateColumnForm

// QA: Brian Francisc 10-26-23