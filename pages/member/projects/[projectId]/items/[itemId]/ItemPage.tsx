import { useState } from "react"

import { GetServerSideProps, Redirect } from "next"
import { getSession } from "next-auth/react"

import { Stack, Typography } from "@mui/material"

import { findMember } from "@/mongo/controls/member/memberControls"
import { findProject } from "@/mongo/controls/project/projectControls"
import { findItem } from "@/mongo/controls/member/project/items/findItem"

import InfoPageLayout from "@/fx/ui/InfoPageLayout"
import Permission, { NoPermission, PermissionCodes, permission } from "@/fx/ui/PermissionComponent"

import { Project, ProjectContext } from "@/react/project/"
import { Member, MemberContext } from "@/react/members"
import { ItemContext } from "@/react/item/ItemContext"

import { Section } from "@/react/section/section-types"

import ItemTitleForm from "@/react/item/components/forms/ItemTitleForm"
import CreateSectionForm from "@/react/section/components/forms/CreateSectionForm"
import TextSection from "@/react/section/components/TextSection"
import CodeSection from "@/react/section/components/CodeSection"
import ArchiveItemForm from "@/react/item/components/forms/ArchiveItemForm"
import { Item } from "@/react/item/item-types"


export interface MemberItemPageProps {
  project: Project
  member: Member
  item: any
}
export const ItemPage = (props: MemberItemPageProps) => {

  const {member, project} = props

  const [item, setItem] = useState<Item>(props.item)
  const [showForm, setShowForm] = useState<boolean>(false)

  const EditItemTitle = (
    <>
      <Permission code={PermissionCodes.ITEM_OWNER} item={item} member={member}>
        <Typography variant={'h1'}
          sx={{p: 5, pl: 2, fontSize: {xs: '2rem', sm: '3rem'}, width: '100%' }}
          onClick={() => setShowForm(true)} noWrap>
          {item.title}
        </Typography>
      </ Permission>
      <NoPermission code={PermissionCodes.ITEM_OWNER} item={item} member={member}>
        <Typography variant={'h1'}
          sx={{p: 5, pl: 2, fontSize: {xs: '2rem', sm: '3rem'}, width: '100%' }}>
          {item.title}
        </Typography>
      </NoPermission>
    </>
  )

  const ItemTitle = ( <ItemTitleForm closeForm={() => setShowForm(false)}/> )

  return (
    <ProjectContext.Provider value={{project, setProject: () => {}}}>
      <ItemContext.Provider value={{item, setItem}}>
        <MemberContext.Provider value={{member, setMember: () => {}}}>
          <InfoPageLayout title={ showForm ? ItemTitle : ItemTitle }>
            <Stack spacing={3} alignItems={'flex-start'} sx={{p: 10, pt: 5, width: '100%'}}>
              { item.sections?.map( ( s: Section) => {
                if(s.sectiontype === "63b88d18379a4f30bab59bad"){
                  return (
                    <CodeSection section={s} key={s.id}/>
                  )
                }
                return ( <TextSection section={s} key={s.id} />)
              })}
              <CreateSectionForm />
              <ArchiveItemForm />
            </Stack>
          </InfoPageLayout>
        </MemberContext.Provider>
      </ItemContext.Provider>
    </ProjectContext.Provider>
  )
}

export default ItemPage


const unAuthRedirect: Redirect = {destination: "/", permanent: false}
export const getServerSideProps:
GetServerSideProps<MemberItemPageProps> = async(context) => {

  const authSession = await getSession({req: context.req})

  if(!authSession){
    return {redirect: {destination: "/", permanent: false}}
  }

  const member: Member | false = await findMember(authSession?.user?.email)

  if(member){

    if( typeof context.query.projectId !== "string" ) return {redirect: unAuthRedirect}

    const project: Project = await findProject(context.query.projectId)
    const hasPermission = permission({code: PermissionCodes.PROJECT_MEMBER, member, project})

    if(hasPermission){

      if( typeof context.query.itemId !== "string" ) return {redirect: unAuthRedirect}

      const item = await findItem(context?.query?.itemId)
      return {props: {project, member, item}}
    }
  }
  return {redirect: {destination: "/", permanent: false}}
}

// QA: Brian Francis 9-27-2023
// Depreciated: 9-27-2023 use Modal instead
// TODO: replace getItem with findItem