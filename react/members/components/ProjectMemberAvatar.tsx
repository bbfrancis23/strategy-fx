import { Avatar, AvatarProps, Badge, BadgeProps, IconProps, SxProps } from "@mui/material"
import LeaderBadgeIcon from '@mui/icons-material/Star'
import AdminBadge from '@mui/icons-material/Shield'

import { Member } from "@/react/members"
import { PermissionCodes } from "@/fx/ui"
export interface ProjectMemberAvatarProps {
  type: PermissionCodes,
  member: Member,
}

export const ProjectMemberAvatar = ( {type, member}: ProjectMemberAvatarProps) => {

  const getAvatar = () => {
    let avatar = ''
    if(!member) return avatar

    if(member.name){
      const names = member.name.split(' ')
      const firstInitial = names[0].charAt(0)
      const secondInitial = names[1] ? names[1].charAt(0) : ''
      avatar = [firstInitial, secondInitial].join('')

      return avatar
    }
    avatar = member.email.charAt(0)
    return avatar
  }

  const getImgAvatar = (): string => {
    if(! member) return ''
    if(! member.image) return ''
    return member.image
  }

  const avatarProps: AvatarProps = {
    src: getImgAvatar(),
    sx: {
      fontSize: '1.25rem',
      color: 'secondary.contrastText',
      bgcolor: 'secondary.main',
      width: 40,
      height: 40
    }
  }

  const badgeProps: BadgeProps = {
    overlap: 'circular',
    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },

  }

  const badgeIconSxProps: SxProps = {
    color: 'primary.light',
    width: '30',
    height: 30
  }

  return (
    <>
      {(type === PermissionCodes.PROJECT_MEMBER) && (
        <Avatar src={getImgAvatar()} >{getAvatar()}</Avatar>
      ) }
      { type === PermissionCodes.PROJECT_LEADER && (
        <Badge {...badgeProps} badgeContent={ <LeaderBadgeIcon sx={badgeIconSxProps} /> } >
          <Avatar {...avatarProps}>{getAvatar()}</Avatar>
        </Badge>
      ) }
      { type === PermissionCodes.PROJECT_ADMIN && (
        <Badge {...badgeProps} badgeContent={<AdminBadge sx={badgeIconSxProps}/>} >
          <Avatar {...avatarProps}>{getAvatar()}</Avatar>
        </Badge>
      ) }
    </>
  )
}

// QA Brian Francis 10-29-23