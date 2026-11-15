"use client";

import type { Product } from "@ecommerce/api-contracts";
import { useDeleteImage, useSetPrimaryImage, useUploadImage } from "@ecommerce/ecommerce-hooks";
import { Button, Field, Input } from "@ecommerce/ui-primitives";
import { useState } from "react";
import { ErrorNotice } from "../../components/page-state";

export function ProductImages({ product }: { product: Product }) {
  const upload = useUploadImage();
  const remove = useDeleteImage();
  const primary = useSetPrimaryImage();
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const error = upload.error ?? remove.error ?? primary.error;
  return (
    <section aria-labelledby="images-title">
      <h2 id="images-title">Images</h2>
      <ul className="image-grid">
        {product.images?.map((image) => (
          <li key={image.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- backend-served media, no Next image loader configured */}
            <img src={image.thumbnailUrl} alt={image.altText} width={120} />
            <p>{image.isPrimary ? "Primary" : null}</p>
            {!image.isPrimary ? <Button className="secondary" disabled={primary.isPending} onClick={() => primary.mutate({ id: product.id, imageId: image.id })}>Make primary</Button> : null}{" "}
            <Button className="danger" disabled={remove.isPending} onClick={() => remove.mutate({ id: product.id, imageId: image.id })}>Remove</Button>
          </li>
        ))}
      </ul>
      {!product.images?.length ? <p className="muted">No images.</p> : null}
      <form
        className="form-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (file) upload.mutate({ id: product.id, file, altText }, { onSuccess: () => { setFile(null); setAltText(""); (e.target as HTMLFormElement).reset(); } });
        }}
      >
        <Field label="Image file">{(id) => <Input id={id} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}</Field>
        <Field label="Alt text">{(id) => <Input id={id} value={altText} onChange={(e) => setAltText(e.target.value)} />}</Field>
        {error ? <ErrorNotice error={error} /> : null}
        <Button type="submit" disabled={!file || upload.isPending}>Upload image</Button>
      </form>
    </section>
  );
}
