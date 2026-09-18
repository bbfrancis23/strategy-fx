import { useState, useContext } from "react"
import { Box, Button, IconButton, Paper, TextField, TextFieldProps } from "@mui/material"
import DoneIcon from '@mui/icons-material/Done'
import CloseIcon from '@mui/icons-material/Close'
import { useSnackbar } from "notistack"
import { Form, FormikProvider, useFormik } from "formik"
import * as Yup from "yup"
import axios from "axios"
import { Column } from "@/react/column"
import { BoardContext } from "@/react/board"
import { ProjectContext } from "@/react/project"
import ItemStub from "../ItemStub"
import { ClickAwaySave, FormActions, SaveButton } from "@/fx/ui"

export interface CreateItemFormProps{ column: Column}

const createItemSchema = Yup.object().shape({ title: Yup.string().required('Title is required')})

const CreateItemForm = ({column}: CreateItemFormProps) => {

  const {project} = useContext(ProjectContext)
  const {board, setBoard} = useContext(BoardContext)
  const {enqueueSnackbar} = useSnackbar()

  const [showForm, setShowForm] = useState<boolean>(false)

  const formik = useFormik({
    initialValues: { title: '' },
    validationSchema: createItemSchema,
    onSubmit: (data) => {
      const projectDir = `/api/members/projects/${project.id}`
      const itemDir = `${projectDir}/boards/${board.id}/columns/${column.id}/items`
      axios.post(itemDir, {title: data.title} )
        .then((res) => {
          formik.setSubmitting(false)
          if (res.status === axios.HttpStatusCode.Created ){
            setBoard(res.data.board)
            enqueueSnackbar("Item created", {variant: "success"})
            setShowForm(false)
            formik.resetForm()
          }
        })
        .catch((error) => {
          formik.setSubmitting(false)
          enqueueSnackbar(error.message, {variant: "error"})
        })
    }
  })

  const handleCloseForm = () => {
    formik.resetForm()
    setShowForm(false)
  }

  const {errors, touched, handleSubmit, getFieldProps} = formik

  const textFieldProps: TextFieldProps = {
    size: 'small',
    label: 'New Card',
    error: Boolean(touched && errors.title),
    helperText: touched && errors.title,
    fullWidth: true,
    ...getFieldProps('title'),
    autoFocus: true
  }

  const ItemForm = (
    <Paper sx={{p: 1, mt: 2, mb: 1}}>
      <FormikProvider value={formik}>
        <ClickAwaySave>
          <Form autoComplete="off" noValidate onSubmit={handleSubmit}>
            <Box sx={{ ml: 1, display: 'block'}}>
              <Box sx={{ display: 'flex'}}><TextField {...textFieldProps} /></Box>
              <Box display={{ display: 'flex', justifyContent: "right" }}>
                <FormActions onCancel={handleCloseForm} title="Card" />
              </Box>
            </ Box>
          </Form>
        </ClickAwaySave>
      </FormikProvider>
    </Paper>
  )

  return (
    showForm ? ItemForm
      : <Button aria-label="create-item" onClick={() => setShowForm(true)}
        sx={{display: 'block', p: 0, mt: 2, mb: 1}}>
        <ItemStub />
      </Button>
  )
}

export default CreateItemForm

// QA: Brian Francisc 10-28-23