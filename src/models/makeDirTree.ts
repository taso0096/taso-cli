import firebase from 'firebase/app';

interface GitHubFile {
  path: string;
  type: string;
  sha: string;
}
type GitHubDir = GitHubFile[];

export interface DirObject {
  [key: string]: any;
}

export const getRootDir = async(parentRef: firebase.storage.Reference): Promise<DirObject> => {
  const rootDir = {};
  await getStorageDir(rootDir, parentRef);
  return rootDir;
};

const getStorageDir = async(parentDir: DirObject, parentRef: firebase.storage.Reference) => {
  return parentRef.listAll()
    .then(async res => {
      for (const dirRef of res.prefixes) {
        parentDir[dirRef.name] = {};
        await getStorageDir(parentDir[dirRef.name], dirRef);
      }
      for (const fileRef of res.items) {
        parentDir[fileRef.name] = true;
      }
    })
    .catch();
};

export const getRepoDir = async(user: string, repo: string): Promise<DirObject> => {
  const repoDir = {};
  const commitSha: null | string = await fetch(`https://api.github.com/repos/${user}/${repo}/commits`)
    .then(res => {
      if (res.status !== 200) {
        throw new Error();
      }
      return res.json();
    })
    .then(json => json[0].sha)
    .catch(() => null);

  if (commitSha) {
    await getShaDir(repoDir, user, repo, commitSha);
  }
  return repoDir;
};

const getShaDir = async(parentDir: DirObject, user: string, repo: string, sha: string): Promise<void> => {
  const dir: GitHubDir = await getShaTree(user, repo, sha);
  for (const file of dir) {
    const { path, type, sha } = file;
    parentDir[path] = type === 'tree' ? {} : true;
    if (type === 'tree') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await getShaDir(parentDir[path], user, repo, sha);
    }
  }
};

const getShaTree = async(user: string, repo: string, sha: string): Promise<GitHubDir> => {
  return fetch(`https://api.github.com/repos/${user}/${repo}/git/trees/${sha}`)
    .then(res => res.json())
    .then(json => json.tree);
};
