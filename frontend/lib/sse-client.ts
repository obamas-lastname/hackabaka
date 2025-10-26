
export function SSEClient(onMessage: (data: any) => void, onError: (error: any) => void) {
	  const eventSource = new EventSource("/api/stream");
	  eventSource.onmessage = (event) => {
	    const data = JSON.parse(event.data);
		console.log("Received transaction: ", data);
	    onMessage(data);
	  };
	  eventSource.onerror = (error) => {
	    onError(error);
	  };
	  return () => {
	    eventSource.close();
	  };
}
