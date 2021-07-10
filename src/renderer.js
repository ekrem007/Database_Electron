// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict'

const { ipcRenderer } = require('electron')

async function main() {
  // breakpoints should work from here on,
  // toggle them with F9 or just use 'debugger'
  //debugger

  // await the document to finish loading
  await new Promise(resolve => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', resolve) : resolve())

  // notify Main that Renderer is ready
  ipcRenderer.send('rendererReady', null)

  // await confirmation that Main is ready
  await new Promise(resolve => ipcRenderer.once('mainReady', resolve))

  // now both Main and Renderer processes are ready
  // we can do whatever we want
}

document.onkeydown = (ev => {
  if (ev.key == 'F5') {
    location.reload()
  }
})

//#region Window Maximize

const maximizeIcon = document.querySelector(".window-action>svg.maximize")
const dragArea = document.querySelector(".drag-area")

ipcRenderer.on("window-action", (event, action) => {
  switch (action) {
    case "maximize":
      maximizeIcon.classList.remove("maximize")
      maximizeIcon.classList.add("restore")
      dragArea.classList.remove("ms-1", "mt-1")
      break
    case "unmaximize":
      maximizeIcon.classList.add("maximize")
      maximizeIcon.classList.remove("restore")
      dragArea.classList.add("ms-1", "mt-1")
      break
  }
})

//#endregion

main().catch((error) => {
  console.log(error)
  alert(error)
})