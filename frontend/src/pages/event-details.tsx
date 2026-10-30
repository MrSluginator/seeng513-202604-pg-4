import { useParams, useSearchParams } from "react-router-dom";

function EventDetails() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      This is the event details page.
      Event ID = {id}
    </div>
  );
}

export default EventDetails;