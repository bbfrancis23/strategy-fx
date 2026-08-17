import { useContext } from "react"
import router from "next/router"
import { Box, Button } from "@mui/material"
import { useConfirm } from "material-ui-confirm"
import { useSnackbar } from "notistack"
import axios from "axios"
import { ProjectContext } from "@/react/project/"
import { MemberContext } from "@/react/members"
import {Permission, PermissionCodes } from "@/fx/ui"


const ArchiveProjectForm = () => {

  const {member} = useContext(MemberContext)
  const {project} = useContext(ProjectContext)
  const {enqueueSnackbar} = useSnackbar()
  const confirm = useConfirm()

  const handleArchive = async () => {
    try{
      await confirm({description: `Archive ${project.title}`})
        .then( () => {
          axios.patch(`/api/projects/${project.id}`, {archive: true}).then(() => {
            enqueueSnackbar(`Archived ${project.title}`, {variant: "success"})
            router.push("/member")
          }).catch((error) => {
            const errMessage = `Error Archive Project ${error.response.data.message}`
            enqueueSnackbar(errMessage, {variant: "error"})
          })
        })
        .catch((e) => enqueueSnackbar('Archiving aborted', {variant: "error"}) )
    }catch(e){ enqueueSnackbar(`Error2  Archiving ${e}`, {variant: "error"}) }
  }

  return (
    <Permission code={PermissionCodes.PROJECT_LEADER} project={project} member={member} >
      <Box>
        <Button variant={'contained'} color="error" onClick={() => handleArchive()}>
          ARCHIVE PROJECT
        </Button>
      </Box>
    </Permission>
  )

}

export default ArchiveProjectForm

// QA: Brian Francis 10-30-23
