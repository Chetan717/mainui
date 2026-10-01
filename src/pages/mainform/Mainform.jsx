import React from 'react'
import SalesExecutiveForm from './components/SalesExecutiveForm'
import { useEffect } from 'react';
function Mainform() {
  useEffect(() => {
     // Force the window to top when Editor opens
     window.scrollTo(0, 0);
   }, []); 
  return (
    <div className='flex w-full'>

        <SalesExecutiveForm/>
    </div>
  )
}

export default Mainform