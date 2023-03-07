import React, { useState } from 'react'

import { signIn } from 'next-auth/react'

import { Alert, Button, DialogActions, DialogContent, Stack} from '@mui/material'
import { LoadingButton } from '@mui/lab'

import { Form, FormikProvider, useFormik } from 'formik'
import { useSnackbar } from 'notistack';

import AuthSchema from './AuthSchema'
import EmailTextField from './EmailTextField'
import PasswordTextField from './PasswordTextField'
import HttpStatusCodes from '../../enums/HttpStatusCodes'

export default function LoginForm(props: {closeDialog: Function, openRegisterDialog: Function}) {

  const [loginError, setLoginError] = useState<string>('')
  const { enqueueSnackbar } = useSnackbar();

  // registration is disabled for now
  const { closeDialog, openRegisterDialog } = props

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: AuthSchema,
    onSubmit: async (data) => {

      const result = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if(result?.status && result.status === HttpStatusCodes.OK && result.ok === true && result.error === null ){
        closeDialog();
        enqueueSnackbar('You are now Logged In', {variant: 'success'});

      }else{
        if(result?.status === HttpStatusCodes.UNAUTHORIZED){
          if(result.error){
            setLoginError(result?.error)
          }else{
            setLoginError('Unknown Error')
          }        
        }else{
          setLoginError('Unknown Error')
        }
      }
    },
  })

  const { errors, touched, handleSubmit, getFieldProps, isSubmitting, isValid } = formik

  const closeForm = () => { formik.resetForm(); closeDialog(); setLoginError('') }

  // registration is disabled for now
  // const startRegistration = () => { closeDialog(); openRegisterDialog() }

  return (
    <FormikProvider value={formik}>
      <Form autoComplete="off" noValidate onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={3} sx={{ width: '100%' }}>           
            { loginError && (<Alert severity="error">{loginError}</Alert>) }
            <EmailTextField
              getFieldProps={getFieldProps}
              error={errors.email}
              touched={touched.email}
            />
            <PasswordTextField
              getFieldProps={getFieldProps}
              error={errors.password}
              touched={touched.password}
            />            
          </Stack>
        </DialogContent>
        <DialogActions disableSpacing={false}>
          <Button onClick={closeForm}> CANCEL </Button>
          <LoadingButton
            color="success"
            disabled={!(isValid && formik.dirty)}
            type="submit"
            variant="contained"
            loading={isSubmitting}
          >
            Login
          </LoadingButton>
        </DialogActions>
      </Form>
    </FormikProvider>
  )
}