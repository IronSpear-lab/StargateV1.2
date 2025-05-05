import SimpleViewer from "@/components/SimpleViewer";

export default function SimpleViewerPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Simple 3D Viewer</h1>
      <p className="text-muted-foreground mb-6">
        This is a basic viewer showing a rotating wireframe cube to test the ThreeJS rendering.
      </p>
      
      <div className="p-4 border rounded-lg bg-card">
        <SimpleViewer />
      </div>
    </div>
  );
}