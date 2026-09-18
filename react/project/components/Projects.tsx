import { useState } from "react"
import { Button, Grid, SxProps, Typography } from "@mui/material"
import router from "next/router"
import { Project, CreateProjectForm, ProjectStub, CreateProjectFormProps } from "@/react/project"
interface ProjectsProps { projects: Project[]}

const Projects = (props: ProjectsProps) => {

  const [projects, setProjects] = useState<Project[]>(props.projects)
  const [showProjectForm, setShowProjectForm] = useState<boolean>(false)
  const closeCreateProjectForm = () => { setShowProjectForm(false) }

  const createProjectFormProps: CreateProjectFormProps = {
    setProjects: (p: Project[]) => setProjects(p),
    closeForm: closeCreateProjectForm
  }

  const projectButtonSx: SxProps = { m: 0, p: 0, width: '100%' }

  return (
    <>
      <Typography variant={'h4'}>Projects:</Typography>
      { showProjectForm && (
        <CreateProjectForm {...createProjectFormProps} /> ) }
      <Grid container spacing={0} sx={{pr: 3 }}>
        { projects.map( (p: Project) => (
          <Grid item xs={6} sm={3} md={2} key={p.id} sx={{p: 1}}>
            <Button sx={projectButtonSx} onClick={() => router.push(`/member/projects/${p.id}`)} >
              <ProjectStub project={p} />
            </Button>
          </Grid>
        ) ) }
        <Grid item xs={6} sm={3} md={2} sx={{p: 1}}>
          <Button aria-label="create-project" onClick={() => setShowProjectForm(true)}
            sx={{ m: 0, p: 0, width: '100%'}}>
            <ProjectStub />
          </Button>
        </Grid>
      </Grid>
    </>
  )
}

export default Projects

// QA Brian Francis 10-30-23