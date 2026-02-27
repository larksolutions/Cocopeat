import { Link } from "react-router"; // <-- Make sure this is 'react-router-dom'
import { PlusIcon } from "lucide-react";
import toast from "react-hot-toast";

// Accept 'isBatchActive' and 'areSuppliesLow'
const Navbar = ({ isBatchActive, areSuppliesLow }) => {

  // Combine logic
  const isDisabled = isBatchActive || areSuppliesLow;
  let tooltipMessage = "Create a new batch";

  if (isBatchActive) {
    tooltipMessage = "A batch is already in progress.";
  } else if (areSuppliesLow) {
    tooltipMessage = "Cannot start: Supplies are low.";
  }

  const handleNewBatchClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      toast.error(tooltipMessage, { duration: 4000 });
    }
  };

  return (
    <header className="bg-base-300 border-b border-base-content/10">
      <div className="mx-auto max-w-6xl p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary font-mono tracking-tighter">Pot-O-Matic</h1>
          <div className="flex items-center gap-4">
            
            <div
              className="tooltip tooltip-bottom"
              data-tip={tooltipMessage} 
            >
              <Link
                to={"/create"}
                className={`btn btn-primary ${isDisabled ? "btn-disabled" : ""}`}
                onClick={handleNewBatchClick}
              >
                <PlusIcon className="size-5" />
                <span>New Batch</span>
              </Link>
            </div>
            
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;