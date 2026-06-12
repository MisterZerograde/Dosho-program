!macro customInit
  nsExec::ExecToLog 'taskkill /F /IM "Dosho.exe" /T'
  Sleep 500
!macroend
