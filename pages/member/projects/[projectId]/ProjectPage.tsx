import { useState } from "react"

import { GetServerSideProps, InferGetServerSidePropsType } from "next"
import Head from "next/head"
import { getSession } from "next-auth/react"

import {Stack, Typography } from "@mui/material"

import { findProject, findProjectBoards } from "@/mongo/controls/project/projectControls"
import { findMember } from "@/mongo/controls/member/memberControls"

import { Project, ProjectContext,
  ProjectEditTitleForm, ArchiveProjectForm, ProjectMembers, ProjectBoards } from "@/react/project/"
import { Member, MemberContext } from "@/react/members"
import { Board } from "@/react/board"

import { InfoPageLayout, PermissionCodes, permission } from "@/fx/ui"
import { unAuthRedirect } from "@/error"

export type ProjectPage = {
  project: Project;
  member: Member;
  boards: Board[];
}

export const getServerSideProps: GetServerSideProps<ProjectPage> = async(context) => {

  const authSession = await getSession({req: context.req})

  if(! authSession) return {redirect: unAuthRedirect }

  const member: Member | false = await findMember(authSession?.user?.email)
  if(! member) return {redirect: unAuthRedirect }

  if( typeof context.query.projectId !== "string" ) return {redirect: unAuthRedirect}
  const projectId: string = context?.query?.projectId as string

  const project: Project = await findProject(projectId)

  const hasPermission = permission({code: PermissionCodes.PROJECT_MEMBER, member, project})
  if(! hasPermission){ return {redirect: unAuthRedirect} }

  let boards: Board[] = await findProjectBoards(project.id)

  boards = boards.map((b: Board) => ({
    id: b.id,
    title: b.title,
    columns: b.columns
  }))
  return {props: {project, member, boards}}

}

const Page = (projectPage: InferGetServerSidePropsType<typeof getServerSideProps> ) => {

  const [member, setMember] = useState<Member>(projectPage.member)
  const [project, setProject] = useState<Project>(projectPage.project)

  return (
    <ProjectContext.Provider value={{project, setProject}}>
      <MemberContext.Provider value={{member, setMember}}>
        <Head>
          <title>{`Strategy Fx - Projects Page - ${project.title}`}</title>
        </Head>
        <InfoPageLayout title={<ProjectEditTitleForm />}>
          <Stack spacing={3} sx={{ width: '100%'}}>
            <Typography variant="h4">Members</Typography>
            <ProjectMembers />
            <ProjectBoards boards={projectPage.boards}/>
            <Typography variant="h4">Actions</Typography>
            <ArchiveProjectForm />
          </Stack>
        </InfoPageLayout>
      </MemberContext.Provider>
    </ProjectContext.Provider>
  )
}
export default Page

// QA: Brian Francis 10-20-23