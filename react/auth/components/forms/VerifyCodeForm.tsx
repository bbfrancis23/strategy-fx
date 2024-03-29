import {useState} from "react"
import {Alert, Box, Stack, TextField, TextFieldProps} from "@mui/material"
import {useSnackbar} from "notistack"
import axios from "axios"
import {Form, FormikProvider, useFormik} from "formik"
import * as Yup from "yup"
import { PasswordTextField, PasswordSchema, PasswordTextFieldProps} from "@/react/auth"
import { SaveButton } from "@/fx/ui"

interface VerifyCodeFormProps{ email?: string, endForgotPW: () => void}

const yupCode = Yup.string().required("Code is required")
const CodeSchema = Yup.object().shape({ code: yupCode, newPassword:PasswordSchema})

const VerifyCodeForm = ({email, endForgotPW}: VerifyCodeFormProps) => {
  const [serverError, setServerError] = useState<string>("")
  const {enqueueSnackbar} = useSnackbar()

  const formik = useFormik({
    initialValues: { code: "", newPassword: "" },
    validationSchema: CodeSchema,
    onSubmit: (data) => {
      formik.setSubmitting(false)
      axios.post( "/api/auth/check-code", {email, code: data.code, newPassword: data.newPassword} )
        .then((res) => {
          formik.setSubmitting(false)
          formik.resetForm()
          if (res.status === axios.HttpStatusCode.Ok){
            setServerError("")
            endForgotPW()
            enqueueSnackbar("Password Changed", {variant: "success"})
          }
        })
        .catch((error) => {
          formik.setSubmitting(false)
          setServerError(error.response.data.message)
          if(error.response.status === axios.HttpStatusCode.Locked){
            endForgotPW()
            formik.resetForm()
            enqueueSnackbar(error.response.data.message, {variant: "error"})
          }
        })
    }
  })

  const {errors, touched, handleSubmit, getFieldProps} = formik

  const codeField: TextFieldProps = {
    fullWidth: true,
    size: "small",
    type: "text",
    label: "Verification Code",
    ...getFieldProps("code"),
    error: Boolean(touched && errors.code),
    helperText: touched && errors.code,
    autoFocus: true
  }

  const passwordTextField: PasswordTextFieldProps = {
    label: "New Password",
    fieldId: "newPassword",
    getFieldProps,
    error: errors.newPassword,
    touched: touched.newPassword
  }

  return (
    <Box>
      <FormikProvider value={formik}>
        <Form autoComplete="off" noValidate onSubmit={handleSubmit}>
          <Stack spacing={3} sx={{width: "100%"}}>
            { serverError && (<Alert severity="error">{serverError}</Alert>) }
            <TextField {...codeField} />
            <PasswordTextField {...passwordTextField} />
            <SaveButton variant="contained">Change Password</SaveButton>
          </ Stack>
        </ Form>
      </ FormikProvider>
    </ Box>
  )
}

export default VerifyCodeForm

// QA: Brian Francis 10-26-23