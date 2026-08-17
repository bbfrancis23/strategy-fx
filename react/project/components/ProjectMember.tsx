import { useContext } from "react"
import { Avatar, BadgeProps, Badge, Card, CardHeader, Typography} from "@mui/material"
import {CardHeaderProps} from "@mui/material/CardHeader"
import { SxProps } from "@mui/material/styles"
import LeaderBadge from '@mui/icons-material/Star'
import AdminBadge from '@mui/icons-material/Shield'
import { Member } from "@/react/members"
import {Permission, PermissionCodes, NoPermission } from "@/fx/ui"
import { ProjectContext, ProjectMemberActions } from "@/react/project"
export interface ProjectMemberProps {
  type: PermissionCodes
  member: Member
  sessionMember: Member
}

const ProjectMember = ( {type, member, sessionMember}: ProjectMemberProps) => {

  const {project} = useContext(ProjectContext)

  const getAvatar = () => {
    let avatar = ''
    if(! member) return ''

    if(member.name){
      const names = member.name.split(' ')
      const firstInitial = names[0].charAt(0)
      const secondInitial = names[1] ? names[1].charAt(0) : ''
      avatar = [firstInitial, secondInitial].join('')
    }else{ avatar = member.email.charAt(0) }

    return avatar
  }

  const getImgAvatar = () => {

    if(! member) return ''
    if(! member.image) return ''
    return member.image
  }

  const getMemberLabel = () => {
    if(type === PermissionCodes.PROJECT_LEADER) return 'Leader: '
    else if(type === PermissionCodes.PROJECT_ADMIN) return 'Admin: '
    return 'Member: '
  }

  const getBadge = () => {
    if (type === PermissionCodes.PROJECT_LEADER) return (<LeaderBadge fontSize="small" />)
    return (<AdminBadge fontSize="small" />)
  }

  const getMemberActions = () => {
    if(type === PermissionCodes.PROJECT_LEADER) return <></>
    return <ProjectMemberActions sessionMember={sessionMember} member={member} type={type}/>
  }

  const MemberName = () => (
    <Typography variant={'body1'}>{ getMemberLabel() + member.name }</Typography>
  )

  const avatarSxProps: SxProps = {
    bgcolor: 'primary.light',
    color: 'primary.contrastText',
    width: 50, height: 50
  }

  const badgeProps: BadgeProps = {
    overlap: 'circular',
    badgeContent: getBadge(),
    anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
  }

  const MemberAvatar = () => (
    <>
      <Permission code={PermissionCodes.PROJECT_ADMIN} project={project} member={member}>
        <Badge {...badgeProps}>
          <Avatar src={ getImgAvatar()} sx={avatarSxProps} >{getAvatar()}</Avatar>
        </Badge>
      </Permission>
      <NoPermission code={PermissionCodes.PROJECT_ADMIN} project={project} member={member}>
        <Avatar sx={avatarSxProps} >{getAvatar()}</Avatar>
      </NoPermission>
    </>
  )

  const CardHeaderProps: CardHeaderProps = {
    title: <MemberName />,
    subheader: member.email,
    action: getMemberActions(),
    avatar: <MemberAvatar />
  }
  return (
    <Card><CardHeader {...CardHeaderProps} /></Card>
  )
}

export default ProjectMember
// QA Brian 10-30-23