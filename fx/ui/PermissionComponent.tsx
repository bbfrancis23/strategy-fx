/* eslint-disable complexity */
import { ReactNode, useEffect, useState } from 'react'

import { useSession } from 'next-auth/react'

import { Member } from '@/react/members/member-types'
import { Project } from '@/react/project/'
import { Item } from '@/react/item/item-types'

import { Comment } from '@/react/comments/comment-types'

export enum PermissionCodes {
  PROJECT_LEADER = 'ProjectLeader',
  PROJECT_ADMIN = 'ProjectAdmin',
  PROJECT_MEMBER = 'ProjectMember',
  ITEM_OWNER = 'ItemOwner',
  COMMENT_OWNER = 'CommentOwner',
  MEMBER = 'Member',
}

export interface permissionFunction {
  code: PermissionCodes;
  project?: Project;
  member?: Member;
  item?: Item;
  comment?: Comment;
}


export const permission = ( props: permissionFunction): boolean => {

  const {code, project, member, item, comment} = props

  if(! member) return false

  if( code === PermissionCodes.MEMBER ) return true

  if (code === PermissionCodes.PROJECT_MEMBER) {


    if ( (project?.leader) && (project?.leader.id === member.id) ) return true
    if(project?.admins?.find( (a) => a.id === member.id)) return true
    if(project?.members?.find( (a) => a.id === member.id)) return true

  }

  if(code === PermissionCodes.PROJECT_ADMIN){

    if ( (project?.leader) && (project?.leader.id === member.id) ) return true
    if(project?.admins?.find( (a) => a.id === member.id)) return true
  }

  if(code === PermissionCodes.PROJECT_LEADER){

    if ( (project?.leader) && (project?.leader.id === member.id) ) return true

  }

  if(code === PermissionCodes.ITEM_OWNER){
    if(!item) return false
    if(item.owners?.find( (o) => o === member.id)) return true
  }

  if(code === PermissionCodes.COMMENT_OWNER){
    if(!comment) return false
    if(comment.owner?.id === member.id) return true
  }

  return false
}

export interface PermissionComponent {
  code: PermissionCodes;
  children: ReactNode;
  project?: Project;
  member?: Member;
  item?: Item;
  comment?: Comment;
}

export interface PermissionProps extends Omit<PermissionComponent, 'children'> {}

const Permission = (props: PermissionComponent) => {
  const { code, project, member, children, item, comment } = props
  const { data: session, status } = useSession()
  const loading = status === 'loading'

  const [hasPermission, setHasPermission] = useState<boolean>(false)

  useEffect(() => {
    setHasPermission(false)

    setHasPermission(permission({code, member, project, item, comment}))
  }, [session, code, project, member, item, comment])

  return <>{hasPermission && !loading && children}</>
}

export const NoPermission = (props: PermissionComponent) => {

  const { code, project, member, children, item, comment } = props
  const { data: session, status } = useSession()
  const loading = status === 'loading'

  const [hasPermission, setHasPermission] = useState<boolean>(false)

  useEffect(() => {
    setHasPermission(false)

    setHasPermission(permission({code, member, project, item, comment}))
  }, [session, code, project, member, item, comment])

  return ( <>{ (!hasPermission && !loading ) && children}</> )
}

export default Permission

// QA: Brian Francis 08/22/23