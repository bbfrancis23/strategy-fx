import { useContext, useState } from "react"
import { useSession } from "next-auth/react"
import { Box, Button, Skeleton, TextField, TextFieldProps,
  Typography, TypographyProps } from "@mui/material"
import { styled } from "@mui/material/styles"
import { useSnackbar } from "notistack"
import * as Yup from "yup"
import { Form, FormikProvider, useFormik } from "formik"
import axios from "axios"
import { ProjectContext } from "@/react/project/"
import { ClickAwaySave, FormActions } from "@/fx/ui"

const TitleSchema = Yup.object().shape({ title: Yup.string() .required("Title is required")})

const ProjectTitleTextField = styled(TextField)(() => ({
  '& .MuiOutlinedInput-root': { fontSize: '3rem' },
}))

export const ProjectTitleForm = () => {

  const {project} = useContext(ProjectContext)
  const {data: session} = useSession()
  const {enqueueSnackbar} = useSnackbar()

  const [title, setTitle] = useState<string>(project.title)
  const [showTextField, setShowTextField] = useState<boolean>(false)

  const formik = useFormik({
    initialValues: { title },
    validationSchema: TitleSchema,
    onSubmit: (data) => {
      axios.patch(`/api/projects/${project.id}`, {title: data.title})
        .then((res) => {
          formik.setSubmitting(false)
          if (res.status === axios.HttpStatusCode.Ok ){
            enqueueSnackbar("Project Title Updated", {variant: "success"})
            setTitle(data.title)
            setShowTextField(false)
            formik.resetForm({values: {title: data.title}})
          }else{ enqueueSnackbar(res.data.message, {variant: "error"}) }
        }).catch((error) => {
          formik.setSubmitting(false)
          enqueueSnackbar(`Error updating Project Title: ${error}`, {variant: "error"})
        })
    }
  })

  const {errors, touched, handleSubmit, getFieldProps} = formik

  const editTextField = () => {
    if(session && session.user){
      const user:any = session.user
      if(user.id === project.leader?.id) setShowTextField(true)
    }
  }

  const titleProps: TypographyProps = {
    variant: 'h2', noWrap: true,
    onClick: () => editTextField(),
    sx: { p: 5, pl: 2, fontSize: { xs: '2rem', sm: '3rem' }, width: '100%' }
  }

  const textFieldProps: TextFieldProps = {
    fullWidth: true, size: "medium", label: "Title",
    ...getFieldProps("title"),
    sx: { fontSize: '3rem' },
    error: Boolean(touched && errors.title),
    helperText: touched && errors.title,
    inputProps: { maxLength: 26 }
  }

  return (
    <Box >
      {(!showTextField) &&
      <Typography {...titleProps}>{ title ? title : <Skeleton /> }</Typography>
      }
      { showTextField && (
        <Box sx={{ p: 5, pl: 2}}>
          <FormikProvider value={formik}>
            <ClickAwaySave>
              <Form autoComplete="off" noValidate onSubmit={handleSubmit}>
                <ProjectTitleTextField {...textFieldProps} />
                <Box display={{ display: 'flex', justifyContent: "right" }}>
                  {(title && showTextField) && (
                    <FormActions title={'Project Title'} onCancel={() => setShowTextField(false)}
                    />
                  )}
                </Box>
              </Form>
            </ClickAwaySave>
          </FormikProvider>
        </ Box>
      )}
    </Box>
  )
}
export default ProjectTitleForm

// QA: Brian Francis 10-30-23