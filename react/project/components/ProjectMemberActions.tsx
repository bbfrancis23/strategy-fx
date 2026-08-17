import { useContext } from "react"
import { Box, IconButton } from "@mui/material"
import MakeAdminIcon from '@mui/icons-material/AddModerator'
import RemoveMemberIcon from '@mui/icons-material/PersonOff'
import RemoveAdminIcon from '@mui/icons-material/RemoveModerator'
import { useSnackbar } from "notistack"
import axios from "axios"
import { Member } from "@/react/members"
import { ProjectContext } from "@/react/project"
import {Permission, PermissionCodes } from "@/fx/ui"
export interface ProjectMemberActionsProps{
  member: Member;
  type: PermissionCodes;
  sessionMember: Member
}

const ProjectMemberActions = ({member, type, sessionMember}: ProjectMemberActionsProps) => {

  const {project, setProject} = useContext(ProjectContext)
  const {enqueueSnackbar} = useSnackbar()

  const removeFromProject = () => {
    axios.patch(`/api/projects/${project.id}`, {removeMember: member.id})
      .then((res) => {
        enqueueSnackbar(`Member ${member.email} removed from Project`, {variant: "success"})
        setProject(res.data.project)
      }).catch((error) => {
        enqueueSnackbar(`Error removing from Project: ${error.response.data.message}`,
          {variant: "error"})
      })
  }

  const removeProjectAdmin = () => {
    axios.patch(`/api/projects/${project.id}`, {removeAdmin: member.id})
      .then((res) => {
        enqueueSnackbar(`Member ${member.email} removed project admin`, {variant: "success"})
        setProject(res.data.project)
      }).catch((error) => {
        enqueueSnackbar(`Error removing admin: ${error.response.data.message}`, {variant: "error"})
      })
  }

  const makeProjectAdmin = () => {
    axios.patch(`/api/projects/${project.id}`, {makeAdmin: member.id})
      .then((res) => {
        enqueueSnackbar(`Member ${member.email} made an Project admin`, {variant: "success"})
        setProject(res.data.project)
      }).catch((error) => {
        console.log(error)
        enqueueSnackbar(`Error making admin: ${error.response.data.message}`, {variant: "error"})
      })
  }

  return (
    <Permission code={PermissionCodes.PROJECT_LEADER } project={project} member={sessionMember} >
      <Box >
        { type === PermissionCodes.PROJECT_ADMIN && (
          <IconButton size="small" onClick={ () => removeProjectAdmin()} >
            <RemoveAdminIcon fontSize="small"/>
          </IconButton>
        ) }
        { type === PermissionCodes.PROJECT_MEMBER && (
          <>
            <IconButton size={'small'} onClick={ () => removeFromProject()} >
              <RemoveMemberIcon fontSize="small"/>
            </IconButton>
            <IconButton size="small" onClick={ () => makeProjectAdmin()} >
              <MakeAdminIcon fontSize="small"/>
            </IconButton>
          </>
        )}
      </Box>
    </Permission>
  )
}

export default ProjectMemberActions

// QA: Brian Francis 10-30-23